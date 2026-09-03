"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import Map, { Layer, NavigationControl, Source, type LayerProps, type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import { useRouter } from "next/navigation";
import { useMemo, useRef } from "react";
import type { AgencyRecord } from "@/lib/types";

const clusterLayer: LayerProps = { id: "clusters", type: "circle", source: "agencies", filter: ["has", "point_count"], paint: { "circle-color": "#244d40", "circle-radius": ["step", ["get", "point_count"], 18, 8, 23, 20, 29], "circle-stroke-width": 3, "circle-stroke-color": "#f6f2e9" } };
const clusterCount: LayerProps = { id: "cluster-count", type: "symbol", source: "agencies", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 }, paint: { "text-color": "#ffffff" } };
const pointLayer: LayerProps = { id: "unclustered-point", type: "circle", source: "agencies", filter: ["!", ["has", "point_count"]], paint: { "circle-color": ["interpolate", ["linear"], ["get", "score"], 0, "#d7cfc0", 60, "#c47a48", 85, "#244d40"], "circle-radius": 8, "circle-stroke-width": 2, "circle-stroke-color": "#fffaf0" } };

export function AgencyMap({ agencies }: { agencies: AgencyRecord[] }) {
  const router = useRouter();
  const mapRef = useRef<MapRef>(null);
  const geojson = useMemo(() => ({ type: "FeatureCollection" as const, features: agencies.filter((agency) => agency.latitude && agency.longitude).map((agency) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [agency.longitude, agency.latitude] }, properties: { slug: agency.slug, name: agency.name, score: agency.opportunityScore } })) }), [agencies]);
  async function onClick(event: MapLayerMouseEvent) {
    const feature = event.features?.[0];
    if (!feature) return;
    if (feature.layer.id === "clusters") {
      const clusterId = feature.properties?.cluster_id;
      const source = mapRef.current?.getSource("agencies") as { getClusterExpansionZoom?: (id: number) => Promise<number> } | undefined;
      const zoom = await source?.getClusterExpansionZoom?.(clusterId);
      if (zoom && feature.geometry.type === "Point") mapRef.current?.easeTo({ center: feature.geometry.coordinates as [number, number], zoom });
    } else if (feature.properties?.slug) router.push(`/agencies/${feature.properties.slug}`);
  }
  return <div className="map-card"><Map ref={mapRef} initialViewState={{ longitude: -99.6, latitude: 31.2, zoom: 4.65 }} mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json" interactiveLayerIds={["clusters", "unclustered-point"]} onClick={onClick} cursor="pointer"><NavigationControl position="bottom-right" showCompass={false} /><Source id="agencies" type="geojson" data={geojson} cluster clusterMaxZoom={11} clusterRadius={48}><Layer {...clusterLayer} /><Layer {...clusterCount} /><Layer {...pointLayer} /></Source></Map><div className="map-legend"><span><i className="legend-green" />High fit</span><span><i className="legend-rust" />Developing</span></div></div>;
}
