import L from "leaflet";

import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet.fullscreen/dist/Control.FullScreen.css';
import 'leaflet-geosearch/dist/geosearch.css';

import 'leaflet-draw';
import { FullScreen } from 'leaflet.fullscreen';
import { EsriProvider, GeoSearchControl } from 'leaflet-geosearch';

document.addEventListener('livewire:init', () => {
    const leafletMap = ($wire, { config, mapId, afterMapInit }) => {
        let map;

        return {
            config,
            mapId,
            imgsPath: '/vendor/filament-leaflet/images',
            layers: [],
            layerGroups: {},
            baseLayers: {},
            geoJsonLayer: null,
            info: null,
            layerControl: null,
            editableLayers: null,
            isDrawing: false,

            init() {
                this.createMap();
                this.addTileLayers();
                this.setupMapControls();

                if (Object.keys(this.config.geoJsonData)?.length) {
                    this.setupInfoControl();
                    this.loadGeoJson();
                }

                this.addLayerGroups();
                this.addLayers();
                this.setupEventHandlers();
                this.setupLivewireListeners();
                this.setupLayerControl();

                map.invalidateSize();
            },

            getTranslation(key, defaultText = '') {
                return (window.filamentData.translations && window.filamentData.translations[key])
                    ? window.filamentData.translations[key]
                    : defaultText;
            },

            createMap() {
                map = L.map(this.$refs.map, this.config.mapConfig || {})
                    .setView(this.config.defaultCoord, this.config.defaultZoom);
            },

            addTileLayers() {
                this.config.tileLayersUrl.forEach(([label, tileLayerUrl, attribution], index) => {
                    const layer = L.tileLayer(tileLayerUrl, {
                        maxZoom: this.config.zoomConfig.max,
                        minZoom: this.config.zoomConfig.min,
                        attribution: attribution || ''
                    });

                    this.baseLayers[label] = layer;

                    if (index === 0) {
                        layer.addTo(map);
                    }
                });
            },

            setupInfoControl() {
                this.info = L.control();
                this.info.onAdd = () => {
                    const div = L.DomUtil.create('div', `info-${this.mapId}`);
                    this.info._div = div;
                    div.style.display = 'none';
                    return div;
                };

                this.info.update = (props) => {
                    if (!this.info._div) return;

                    if (props) {
                        this.info._div.style.display = 'block';
                        let text = this.config.infoText
                            .replace('{state}', props.name)
                            .replace('{density}', props.density);
                        this.info._div.innerHTML = text;
                    } else {
                        this.info._div.style.display = 'none';
                    }
                };

                this.info.addTo(map);
            },

            async loadGeoJson() {
                if (!this.config.geoJsonUrl) return;

                try {
                    const response = await fetch(this.config.geoJsonUrl);
                    const data = await response.json();

                    const features = Object.entries(this.config.geoJsonData)
                        .filter(([estado]) => data[estado])
                        .map(([estado, densidade]) => ({
                            type: "Feature",
                            id: estado,
                            properties: {
                                name: data[estado].name,
                                density: densidade
                            },
                            geometry: {
                                type: "Polygon",
                                coordinates: data[estado].coordinates
                            }
                        }));

                    this.geoJsonLayer = L.geoJson({
                        type: 'FeatureCollection',
                        features
                    }, {
                        style: (feature) => this.getFeatureStyle(feature),
                        onEachFeature: (feature, layer) => {
                            layer.on({
                                mouseover: (e) => this.info?.update(e.target.feature
                                    .properties),
                                mouseout: () => this.info?.update(),
                                click: (e) => map.fitBounds(e.target
                                    .getBounds())
                            });
                        }
                    }).addTo(map);
                } catch (error) {
                    console.error('Erro GeoJSON:', error);
                }
            },

            getFeatureStyle(feature) {
                const values = Object.values(this.config.geoJsonData);
                const percentage = feature.properties.density / Math.max(...values);
                const index = Math.max(0, Math.ceil(percentage * this.config.geoJsonColors.length) - 1);

                return {
                    fillColor: this.config.geoJsonColors[index],
                    weight: 2,
                    opacity: 1,
                    color: 'white',
                    dashArray: '3',
                    fillOpacity: 0.8
                };
            },

            addLayers() {
                if (!this.config.layers?.length) return;

                this.config.layers.forEach(layerData => {
                    let layer = null;

                    switch (layerData.type) {
                        case 'marker':
                            layer = this.createMarker(layerData);
                            break;
                        case 'circle':
                            layer = this.createCircle(layerData);
                            break;
                        case 'circleMarker':
                            layer = this.createCircleMarker(layerData);
                            break;
                        case 'rectangle':
                            layer = this.createRectangle(layerData);
                            break;
                        case 'polygon':
                            layer = this.createPolygon(layerData);
                            break;
                        case 'polyline':
                            layer = this.createPolyline(layerData);
                            break;
                        default:
                            console.warn(`Tipo de layer desconhecido: ${layerData.type}`);
                            return;
                    }

                    if (!layer) return;

                    // Define o ID do layer
                    layer.options.layerId = layerData.id || null;

                    // Adiciona popup se existir
                    if (layerData.popup) {
                        this.bindPopup(layer, layerData.popup);
                    }

                    // Adiciona tooltip se existir
                    if (layerData.tooltip) {
                        this.bindTooltip(layer, layerData.tooltip);
                    }

                    // Adiciona evento de click
                    if (layerData.clickAction) {
                        layer.on('click', () => $wire.onLayerClick(layerData.id));
                    }

                    // Adiciona evento de mouse over
                    if (layerData.onMouseOver) {
                        layer.on('mouseover', function () {
                            eval(layerData.onMouseOver);
                        });
                    }

                    // Adiciona evento de mouse out
                    if (layerData.onMouseOut) {
                        layer.on('mouseout', function () {
                            eval(layerData.onMouseOut);
                        });
                    }

                    // Adiciona aos layers editáveis se for o caso
                    if (layerData.editable && this.editableLayers) {
                        this.editableLayers.addLayer(layer);
                    }

                    // Adiciona ao grupo ou direto no mapa
                    if (layerData.group) {
                        this.layerGroups[layerData.group]['layer'].addLayer(layer);
                    } else {
                        layer.addTo(map);
                    }

                    // Salva referência
                    this.layers.push({
                        layer,
                        data: layerData
                    });
                });
            },

            addLayerGroups() {
                if (!Object.keys(this.config.layerGroups)?.length > 0) return;

                this.config.layerGroups.forEach(layerGroupData => {
                    let layerGroup = null;

                    switch (layerGroupData.type) {
                        case 'group':
                            layerGroup = L.layerGroup(layerGroupData.options);
                            break;
                        case 'feature':
                            layerGroup = L.featureGroup(layerGroupData.options);
                            break;
                        case 'cluster':
                            layerGroup = L.markerClusterGroup(layerGroupData.options);
                            break;
                    }

                    if (!layerGroup) return;

                    // Adiciona o grupo ao mapa
                    layerGroup.addTo(map);

                    // Salva referência
                    this.layerGroups[layerGroupData.id] = {
                        'name': layerGroupData.name,
                        'layer': layerGroup
                    };
                })
            },

            createMarker(data) {
                if (!data.lat || !data.lng) return null;

                const marker = L.marker([data.lat, data.lng], {
                    icon: this.createIcon(data),
                    title: data.title || data.popup?.title || data.tooltip
                        ?.content || '',
                    draggable: data.draggable || false
                });

                return marker;
            },

            createCircle(data) {
                if (!data.center || !data.radius) return null;
                return L.circle(data.center, data.radius, data.options || {});
            },

            createCircleMarker(data) {
                if (!data.center || !data.radius) return null;
                return L.circleMarker(data.center, data.radius, data.options || {});
            },

            createRectangle(data) {
                if (!data.bounds) return null;
                return L.rectangle(data.bounds, data.options || {});
            },

            createPolygon(data) {
                if (!data.points) return null;
                return L.polygon(data.points, data.options || {});
            },

            createPolyline(data) {
                if (!data.points) return null;
                return L.polyline(data.points, data.options || {});
            },

            createIcon(marker) {
                const options = {
                    iconSize: marker.iconSize || [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                };

                if (marker.icon) {
                    options.iconUrl = marker.icon;
                } else {
                    options.iconUrl =
                        `${this.imgsPath}/marker-icon-2x-${marker.color}.png`;
                    options.shadowUrl = `${this.imgsPath}/marker-shadow.png`;
                }

                return L.icon(options);
            },

            bindPopup(layer, popupConfig) {
                let html = `<div class="custom-popup-${this.mapId}">`;

                if (popupConfig.title) {
                    html += `<h4>${popupConfig.title}</h4>`;
                }

                if (popupConfig.content) {
                    html += popupConfig.content;
                }

                if (popupConfig.fields && Object.keys(popupConfig.fields).length >
                    0) {
                    Object.entries(popupConfig.fields).forEach(([key, value]) => {
                        html +=
                            `<p><span class="field-label">${key}:</span> ${value}</p>`;
                    });
                }

                html += '</div>';

                layer.bindPopup(html, popupConfig.options || {});
            },

            bindTooltip(layer, tooltipConfig) {
                const content = tooltipConfig.content;
                const options = tooltipConfig.options || {};

                layer.bindTooltip(content, options);
            },

            setupLayerControl() {
                let overlays = Object.values(this.layerGroups)
                    .filter((group) => group && group.name)
                    .map((group) => [group.name, group.layer]);

                overlays = Object.fromEntries(overlays);

                const hasBaseLayers = Object.keys(this.baseLayers).length > 1;
                const hasOverlays = Object.keys(overlays).length > 0;

                if (!hasBaseLayers && !hasOverlays) {
                    return;
                }

                if (this.layerControl) {
                    map.removeControl(this.layerControl);
                }

                this.layerControl = L.control.layers(
                    this.baseLayers,
                    overlays,
                ).addTo(map);
            },

            setupMapControls() {
                if (this.config.mapControls.attributionControl) {
                    this.setupAttributionControl();
                }

                if (this.config.mapControls.scaleControl) {
                    this.setupScaleControl();
                }

                if (this.config.mapControls.zoomControl) {
                    this.setupZoomControl();
                }

                if (this.config.mapControls.fullscreenControl) {
                    this.setupFullscreenControl();
                }

                if (this.config.mapControls.searchControl) {
                    this.setupSearchControl();
                }

                if (this.config.mapControls.drawControl) {
                    this.setupDrawControl();
                }
            },

            setupAttributionControl() {
                const attribution = new L.control.attribution();
                attribution.addTo(map);
            },

            setupScaleControl() {
                const scale = new L.control.scale();
                scale.addTo(map);
            },

            setupZoomControl() {
                const zoom = new L.control.zoom();
                zoom.addTo(map);
            },

            setupSearchControl() {
                const provider = new EsriProvider();

                const search = new GeoSearchControl({
                    provider: provider,
                    notFoundMessage: this.getTranslation('address_not_found', ''),
                    searchLabel: this.getTranslation('enter_address', ''),

                    marker: {
                        icon: this.createIcon({
                            color: 'blue'
                        }),
                        draggable: false,
                    },
                });

                search.addTo(map);
            },

            setupFullscreenControl() {
                const fullscreen = new FullScreen({
                    title: this.getTranslation('full_screen', ''),
                    titleCancel: this.getTranslation('exit_full_screen', ''),
                    forceSeparateButton: true,
                });

                fullscreen.addTo(map);
            },

            setupDrawControl() {
                this.editableLayers = new L.FeatureGroup();
                this.editableLayers.addTo(map);

                const draw = new L.Control.Draw({
                    draw: {
                        marker: {
                            icon: this.createIcon({
                                color: 'blue'
                            })
                        }
                    },
                    edit: {
                        featureGroup: Alpine.raw(this.editableLayers),
                        poly: {
                            allowIntersection: false
                        },
                    }
                });

                // Draw toolbar buttons
                L.drawLocal.draw.toolbar.buttons.marker = this.getTranslation('draw_marker', 'Marker');
                L.drawLocal.draw.toolbar.buttons.polygon = this.getTranslation('draw_polygon', 'Polygon');
                L.drawLocal.draw.toolbar.buttons.polyline = this.getTranslation('draw_polyline', 'Polyline');
                L.drawLocal.draw.toolbar.buttons.rectangle = this.getTranslation('draw_rectangle', 'Rectangle');
                L.drawLocal.draw.toolbar.buttons.circle = this.getTranslation('draw_circle', 'Circle');
                L.drawLocal.draw.toolbar.buttons.circlemarker = this.getTranslation('draw_circlemarker', 'Circlemarker');

                // Draw handlers tooltips
                L.drawLocal.draw.handlers.circle.tooltip.start = this.getTranslation('draw_handlers_circle_tooltip_start', 'Click and drag to draw a circle.');
                L.drawLocal.draw.handlers.circlemarker.tooltip.start = this.getTranslation('draw_handlers_circlemarker_tooltip_start', 'Click map to place circle marker.');
                L.drawLocal.draw.handlers.marker.tooltip.start = this.getTranslation('draw_handlers_marker_tooltip_start', 'Click map to place marker.');
                L.drawLocal.draw.handlers.polygon.tooltip.start = this.getTranslation('draw_handlers_polygon_tooltip_start', 'Click to start drawing polygon.');
                L.drawLocal.draw.handlers.polygon.tooltip.cont = this.getTranslation('draw_handlers_polygon_tooltip_cont', 'Click to continue drawing polygon.');
                L.drawLocal.draw.handlers.polygon.tooltip.end = this.getTranslation('draw_handlers_polygon_tooltip_end', 'Click first point to close polygon.');
                L.drawLocal.draw.handlers.polyline.error = this.getTranslation('draw_handlers_polyline_error', 'Line intersects itself.');
                L.drawLocal.draw.handlers.polyline.tooltip.start = this.getTranslation('draw_handlers_polyline_tooltip_start', 'Click to start drawing polyline.');
                L.drawLocal.draw.handlers.polyline.tooltip.cont = this.getTranslation('draw_handlers_polyline_tooltip_cont', 'Click to continue drawing polyline.');
                L.drawLocal.draw.handlers.polyline.tooltip.end = this.getTranslation('draw_handlers_polyline_tooltip_end', 'Click last point to finish polyline.');
                L.drawLocal.draw.handlers.rectangle.tooltip.start = this.getTranslation('draw_handlers_rectangle_tooltip_start', 'Click and drag to draw rectangle.');
                L.drawLocal.draw.handlers.simpleshape.tooltip.end = this.getTranslation('draw_handlers_simpleshape_tooltip_end', 'Release mouse to finish drawing.');

                // Actions
                L.drawLocal.draw.toolbar.actions.title = this.getTranslation('draw_toolbar_actions_title', 'Cancel drawing');
                L.drawLocal.draw.toolbar.actions.text = this.getTranslation('draw_toolbar_actions_text', 'Cancel');

                // Finish and Undo
                L.drawLocal.draw.toolbar.finish.title = this.getTranslation('draw_toolbar_finish_title', 'Finish drawing');
                L.drawLocal.draw.toolbar.finish.text = this.getTranslation('draw_toolbar_finish_text', 'Finish');
                L.drawLocal.draw.toolbar.undo.title = this.getTranslation('draw_toolbar_undo_title', 'Delete last point drawn');
                L.drawLocal.draw.toolbar.undo.text = this.getTranslation('draw_toolbar_undo_text', 'Delete last point');

                // Edit toolbar buttons
                L.drawLocal.edit.toolbar.buttons.edit = this.getTranslation('edit_toolbar_buttons_edit', 'Edit layers');
                L.drawLocal.edit.toolbar.buttons.editDisabled = this.getTranslation('edit_toolbar_buttons_editdisabled', 'No layers to edit');
                L.drawLocal.edit.toolbar.buttons.remove = this.getTranslation('edit_toolbar_buttons_remove', 'Delete layers');
                L.drawLocal.edit.toolbar.buttons.removeDisabled = this.getTranslation('edit_toolbar_buttons_removedisabled', 'No layers to remove');

                // Edit toolbar actions
                L.drawLocal.edit.toolbar.actions.save.title = this.getTranslation('edit_toolbar_actions_save_title', 'Save changes');
                L.drawLocal.edit.toolbar.actions.save.text = this.getTranslation('edit_toolbar_actions_save_text', 'Save');
                L.drawLocal.edit.toolbar.actions.cancel.title = this.getTranslation('edit_toolbar_actions_cancel_title', 'Cancel changes');
                L.drawLocal.edit.toolbar.actions.cancel.text = this.getTranslation('edit_toolbar_actions_cancel_text', 'Cancel');
                L.drawLocal.edit.toolbar.actions.clearAll.title = this.getTranslation('edit_toolbar_actions_clearAll_title', 'Clear all');
                L.drawLocal.edit.toolbar.actions.clearAll.text = this.getTranslation('edit_toolbar_actions_clearAll_text', 'Clear all');

                // Edit handlers
                L.drawLocal.edit.handlers.edit.tooltip.text = this.getTranslation('edit_handlers_edit_tooltip_text', 'Drag handles to edit geometry.');
                L.drawLocal.edit.handlers.edit.tooltip.subtext = this.getTranslation('edit_handlers_edit_tooltip_subtext', 'Click cancel to undo changes.');
                L.drawLocal.edit.handlers.remove.tooltip.text = this.getTranslation('edit_handlers_remove_tooltip_text', 'Click a feature to remove it.');

                draw.addTo(map);
            },

            setupEventHandlers() {
                map.on('click', (e) => {
                    if (this.isDrawing) return;

                    const coords = e.latlng;
                    $wire.onMapClick(
                        coords['lat'],
                        coords['lng']
                    );
                });

                map.on('draw:drawstart', () => {
                    this.isDrawing = true;
                });

                map.on('draw:drawstop', () => {
                    this.isDrawing = false;
                });

                map.on('draw:canceled', () => {
                    this.isDrawing = false;
                });

                map.on('draw:editstart', () => {
                    this.isDrawing = true;
                });

                map.on('draw:editstop', () => {
                    this.isDrawing = false;
                });

                map.on('draw:deletestart', () => {
                    this.isDrawing = true;
                });

                map.on('draw:deletestop', () => {
                    this.isDrawing = false;
                });

                map.on('draw:created', (e) => {
                    e.layer.addTo(Alpine.raw(this.editableLayers));
                });
            },

            setupLivewireListeners() {
                window.addEventListener(`update-leaflet-${this.mapId}`, (event) => {
                    this.updateMapData(event.detail.config);
                });
            },

            updateMapData(newConfig) {
                this.config = newConfig;

                if (Object.keys(this.config.geoJsonData)?.length) {
                    this.setupInfoControl();
                    this.loadGeoJson();
                }

                this.clearLayers();
                this.addLayerGroups();
                this.addLayers();
                this.setupLayerControl();
            },

            clearLayers() {
                this.layers.forEach(({ layer, data }) => {
                    console.log(Alpine.raw(layer));
                    if (data.group) {
                        this.layerGroups[data.group].layer.removeLayer(Alpine.raw(layer));
                    } else {
                        map.removeLayer(Alpine.raw(layer));
                    }
                });

                this.layers = [];

                Object.values(this.layerGroups).forEach(({ layer }) => {
                    map.removeLayer(Alpine.raw(layer));
                });

                this.layerGroups = {};

                if (this.layerControl) {
                    map.removeControl(this.layerControl);
                    this.layerControl = null;
                }
            },
        }
    }

    window.leafletMap = leafletMap;
});