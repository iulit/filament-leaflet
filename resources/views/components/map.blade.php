@props([
    'config',
    'key' => null
])

@php
    use Filament\Support\Facades\FilamentAsset;
    use Illuminate\Support\Js;
@endphp

<div
    wire:ignore
    style="height: {{ $config['mapHeight'] }}px"
    x-data="leafletMap(
        $wire,
        {{ Js::from($config) }},
        {{ Js::from($key) }}
    )"
>
    <div id="{{ $config['mapId'] }}"></div>
</div>
