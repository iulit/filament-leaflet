@props(['mapId', 'config'])
@php
    use Filament\Support\Facades\FilamentAsset;
    use \Illuminate\Support\Js;
@endphp

<div
    wire:ignore
    x-data="leafletMap($wire, {
        config: {{ Js::from($config) }},
        mapId: '{{ $mapId }}',
    })"
>
    <div x-ref="map" id="{{ $mapId }}"></div>
</div>
