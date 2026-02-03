<?php

namespace EduardoRibeiroDev\FilamentLeaflet\Fields;

use EduardoRibeiroDev\FilamentLeaflet\Concerns\HasMapConfig;
use EduardoRibeiroDev\FilamentLeaflet\Enums\TileLayer;
use Filament\Forms\Components\Field;
use Filament\Support\Components\Attributes\ExposedLivewireMethod;

class MapPicker extends Field
{
    use HasMapConfig {
        getGeoJsonTooltip as getParentGeoJsonTooltip;
    }

    protected string $view = 'filament-leaflet::fields.map-picker';

    protected array $geoJsonData = [];
    protected ?string $geoJsonTooltip = null;
    protected array $markers = [];
    protected array $shapes = [];
    protected ?string $latitudeFieldName = 'latitude';
    protected ?string $longitudeFieldName = 'longitude';

    public static function make(?string $name = null): static
    {
        return parent::make($name)
            ->height(256);
    }

    public function center(float $latitude, float $longitude): static
    {
        $this->mapCenter = [$latitude, $longitude];

        return $this;
    }

    public function height(int $height): static
    {
        $this->mapHeight = $height;

        return $this;
    }

    public function zoom(int $zoomLevel): static
    {
        $this->defaultZoom = $zoomLevel;

        return $this;
    }

    public function attributionControl(bool $enabled = true): static
    {
        $this->hasAttributionControl = $enabled;

        return $this;
    }

    public function fullscreenControl(bool $enabled = true): static
    {
        $this->hasFullscreenControl = $enabled;

        return $this;
    }

    public function searchControl(bool $enabled = true): static
    {
        $this->hasSearchControl = $enabled;

        return $this;
    }

    public function scaleControl(bool $enabled = true): static
    {
        $this->hasScaleControl = $enabled;

        return $this;
    }

    public function zoomControl(bool $enabled = true): static
    {
        $this->hasZoomControl = $enabled;

        return $this;
    }

    public function drawControl(bool $enabled = true): static
    {
        $this->hasDrawControl = $enabled;

        return $this;
    }

    public function tileLayersUrl(TileLayer|string|array $urls): static
    {
        $this->tileLayersUrl = $urls;

        return $this;
    }

    public function minZoom(int $minZoom): static
    {
        $this->minZoom = $minZoom;

        return $this;
    }

    public function maxZoom(int $maxZoom): static
    {
        $this->maxZoom = $maxZoom;

        return $this;
    }

    public function geoJsonUrl(string $url): static
    {
        $this->geoJsonUrl = $url;

        return $this;
    }

    public function geoJsonData(array $data): static
    {
        $this->geoJsonData = $data;

        return $this;
    }

    public function geoJsonColors(array $colors): static
    {
        $this->geoJsonColors = $colors;

        return $this;
    }

    public function geoJsonTooltip(?string $tooltip): static
    {
        $this->geoJsonTooltip = $tooltip;

        return $this;
    }

    public function markers(array $markers): static
    {
        $this->markers = $markers;

        return $this;
    }

    public function shapes(array $shapes): static
    {
        $this->shapes = $shapes;

        return $this;
    }

    public function latitudeFieldName(?string $name): static
    {
        $this->latitudeFieldName = $name;

        return $this;
    }

    public function longitudeFieldName(?string $name): static
    {
        $this->longitudeFieldName = $name;

        return $this;
    }

    public function setUp(): void
    {
        parent::setUp();

        $this->afterStateHydrated(function (MapPicker $component, $state) {
            if (is_array($state) && isset($state['latitude']) && isset($state['longitude'])) {
                $component->state([
                    'latitude' => $state['latitude'],
                    'longitude' => $state['longitude'],
                ]);
            }
        });
    }

    protected function getMarkers(): array
    {
        return $this->markers;
    }

    protected function getShapes(): array
    {
        return $this->shapes;
    }

    protected function getGeoJsonTooltip(): string
    {
        if ($this->geoJsonTooltip !== null) {
            return $this->geoJsonTooltip;
        }

        return $this->getParentGeoJsonTooltip();
    }

    #[ExposedLivewireMethod]
    public function handleMapClick(float $latitude, float $longitude): void
    {
        $this->state([
            $this->latitudeFieldName => $latitude,
            $this->longitudeFieldName => $longitude
        ]);
    }
}
