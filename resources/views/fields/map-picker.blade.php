@php
    $config = $getMapData();
    $key = $getKey();
@endphp

<x-dynamic-component
    :component="$getFieldWrapperView()"
    :field="$field"
>
    <x-filament-leaflet::map
        :config="$config"
        :key="$key"
    />

</x-dynamic-component>