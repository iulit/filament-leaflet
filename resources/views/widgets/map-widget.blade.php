@php
    $config = $this->getWidgetData();
    $widgetId = $this->getId();
@endphp


<x-filament-widgets::widget>

    <x-filament::section>
        <x-slot name="heading">
            {{ $this->getHeading() }}
        </x-slot>

        <x-filament-leaflet::map :map-id="$widgetId" :config="$config"/>
    </x-filament::section>

    {{-- Obtém apenas o formulário da ação (modal) --}}
    {{ $this->createMarkerAction->getFormToSubmit() }}
    <x-filament-actions::modals />

    {{-- Estilos CSS --}}
    <style>
        #{{ $widgetId }} {
            height: {{ $this->getMapHeight() }}px;
            width: 100%;
            z-index: 0;
            border-radius: 5px;
            overflow: hidden;
            color: black;
        }

        .info-{{ $widgetId }} {
            padding: 8px 10px;
            font: 14px/16px Arial, Helvetica, sans-serif;
            background: rgba(255, 255, 255, 0.9);
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
            border-radius: 5px;
            color: #333;
            border: 1px solid #ccc;
        }

        .custom-popup-{{ $widgetId }} {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 14px;
            max-width: 300px;
        }

        .custom-popup-{{ $widgetId }} h4 {
            margin: 0 0 8px 0;
            color: #333;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
        }

        .custom-popup-{{ $widgetId }} p {
            margin: 4px 0;
            color: #666;
            line-height: 1.4;
        }

        .custom-popup-{{ $widgetId }} .field-label {
            font-weight: bold;
            color: #444;
        }

        .custom-popup-{{ $widgetId }} a {
            color: #0066cc;
            text-decoration: none;
        }

        .custom-popup-{{ $widgetId }} a:hover {
            text-decoration: underline;
        }

        /* Target the layer control button inside your specific map widget */
        #{{ $widgetId }} .leaflet-control-layers-toggle {
            background-image: url('/vendor/filament-leaflet/images/layers-2x.png') !important;
            background-size: 26px 26px;
            background-position: center;
        }

        .leaflet-draw-toolbar a {
            background-image: url('/vendor/filament-leaflet/images/spritesheet-2x.png') !important;
        }

        {!! $this->getCustomStyles() !!}
    </style>

    {!! $this->getAdditionalScripts() !!}
</x-filament-widgets::widget>
