"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";

export interface MapFeatureData {
  id: number;
  name: string;
  feature_type: "beach" | "poi" | "protected_area" | "restricted_area" | "activity_zone" | "risk_zone";
  latitude: number;
  longitude: number;
  geometry?: {
    type: string;
    coordinates: any;
  };
  properties: {
    region_id?: string;
    category?: string;
    patrol_status?: string;
    amenities?: string[];
    suitable_activities?: string[];
    caution_notes?: string;
    status?: string;
    restriction?: string;
    hazard_level?: string;
    warning?: string;
    clearance?: string;
    is_restricted?: boolean;
    allowed_roles?: string[];
    shelter_rating?: string;
    visiting_hours?: string;
    wave_height_threshold?: string;
  };
  reliability?: string;
}

export interface SectorHubData {
  id: string;
  name: string;
  state: string;
  center: [number, number];
  zoom: number;
  count: number;
}

interface OceanLeafletMapProps {
  features: MapFeatureData[];
  selectedFeatureId: number | null;
  onSelectFeature: (feature: MapFeatureData) => void;
  activeLayer: "swell" | "wind" | "sst" | "radar" | "bathy";
  selectedDepth?: string;
  centerCoords?: [number, number];
  zoomLevel: number;
  onZoomChange?: (zoom: number) => void;
  onCenterChange?: (coords: [number, number]) => void;
  onBboxChange?: (bbox: string) => void;
  viewScopeMode?: "local" | "open_world";
  sectorHubs?: SectorHubData[];
  onSelectSectorHub?: (hub: SectorHubData) => void;
}

export default function OceanLeafletMap({
  features,
  selectedFeatureId,
  onSelectFeature,
  activeLayer,
  selectedDepth = "0m",
  centerCoords,
  zoomLevel,
  onZoomChange,
  onCenterChange,
  onBboxChange,
  viewScopeMode = "local",
  sectorHubs = [],
  onSelectSectorHub,
}: OceanLeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
  const polygonsLayerRef = useRef<LayerGroup | null>(null);
  const bathyLayerRef = useRef<LayerGroup | null>(null);
  const radarLayerRef = useRef<any>(null);
  const baseTilesRef = useRef<any>(null);
  const lastAppliedCenterRef = useRef<[number, number] | null>(null);
  const lastAppliedZoomRef = useRef<number | null>(null);

  // 1. Initialize Leaflet Map once on mount
  useEffect(() => {
    let isMounted = true;

    async function init() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;
      const L = (await import("leaflet")).default;

      if (!isMounted || !mapContainerRef.current) return;

      // Fix default Leaflet icon paths in bundler environments
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Create Leaflet map centered on Gopalpur coastal sector (19.33° N, 84.98° E)
      const map = L.map(mapContainerRef.current, {
        center: centerCoords || [19.33, 84.98],
        zoom: zoomLevel || 9,
        minZoom: 5,
        maxZoom: 18,
        zoomControl: false, // Using our custom ORCA HUD zoom controls
        attributionControl: true,
        scrollWheelZoom: true,
        wheelDebounceTime: 40,
        wheelPxPerZoomLevel: 60,
        touchZoom: true,
      });

      // Default Basemap: High-Resolution Satellite Ocean & Coastal Imagery (True-color satellite, no watermark)
      const satBasemap = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            "Tiles © Esri, Maxar, Earthstar Geographics · ISRO NavIC Grid",
          maxZoom: 18,
        }
      ).addTo(map);
      baseTilesRef.current = satBasemap;

      // OpenSeaMap Nautical Marks layer (buoys, beacons, fairways)
      L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", {
        attribution: "Map data: © OpenSeaMap contributors",
        opacity: 0.85,
      }).addTo(map);

      // Create LayerGroups for dynamic features
      const markersLayer = L.layerGroup().addTo(map);
      const polygonsLayer = L.layerGroup().addTo(map);
      const bathyLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      polygonsLayerRef.current = polygonsLayer;
      bathyLayerRef.current = bathyLayer;

      // Record initial center & zoom
      lastAppliedCenterRef.current = centerCoords ? [centerCoords[0], centerCoords[1]] : [19.33, 84.98];
      lastAppliedZoomRef.current = zoomLevel || 9;

      // Map move/zoom listeners to report dynamic bounding box and user-panned center
      map.on("moveend", () => {
        const center = map.getCenter();
        lastAppliedCenterRef.current = [center.lat, center.lng];
        if (onCenterChange) {
          onCenterChange([center.lat, center.lng]);
        }
        if (onBboxChange) {
          const bounds = map.getBounds();
          const bbox = `${bounds.getWest().toFixed(3)},${bounds.getSouth().toFixed(3)},${bounds.getEast().toFixed(3)},${bounds.getNorth().toFixed(3)}`;
          onBboxChange(bbox);
        }
      });

      map.on("zoomend", () => {
        const z = map.getZoom();
        lastAppliedZoomRef.current = z;
        if (onZoomChange) {
          onZoomChange(z);
        }
      });

      mapInstanceRef.current = map;
      if (typeof window !== "undefined") {
        (window as any).__orcaLeafletMap = map;
      }
    }

    init();

    return () => {
      isMounted = false;
      if (typeof window !== "undefined") {
        (window as any).__orcaLeafletMap = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Pan/Fly to searched/selected coordinates ONLY when centerCoords changes externally
  // (e.g. user selected a new coastal sector, clicked a search result, or clicked a sector hub)
  useEffect(() => {
    if (!mapInstanceRef.current || !centerCoords) return;

    // Check if centerCoords matches what the map center already is (within ~10m)
    const last = lastAppliedCenterRef.current;
    if (last) {
      const diffLat = Math.abs(last[0] - centerCoords[0]);
      const diffLng = Math.abs(last[1] - centerCoords[1]);
      if (diffLat < 0.0001 && diffLng < 0.0001) {
        return;
      }
    }

    lastAppliedCenterRef.current = [centerCoords[0], centerCoords[1]];
    const currentCenter = mapInstanceRef.current.getCenter();
    const dist = Math.hypot(currentCenter.lat - centerCoords[0], currentCenter.lng - centerCoords[1]);
    const currentZoom = mapInstanceRef.current.getZoom();
    const targetZoom = zoomLevel || currentZoom;

    if (dist > 3.0) {
      // Inter-state macro jumps: instant setView to prevent sub-orbital zoom thrashing
      mapInstanceRef.current.setView(centerCoords, targetZoom, { animate: false });
    } else if (dist > 0.001) {
      // Local sector pans: smooth animated pan
      mapInstanceRef.current.setView(centerCoords, targetZoom, { animate: true });
    }
  }, [centerCoords?.[0], centerCoords?.[1]]);

  // 3. Sync external zoom level changes WITHOUT resetting or jumping the map center
  useEffect(() => {
    if (!mapInstanceRef.current || zoomLevel === undefined) return;
    if (mapInstanceRef.current.getZoom() === zoomLevel) {
      lastAppliedZoomRef.current = zoomLevel;
      return;
    }
    if (lastAppliedZoomRef.current !== zoomLevel) {
      lastAppliedZoomRef.current = zoomLevel;
      mapInstanceRef.current.setZoom(zoomLevel);
    }
  }, [zoomLevel]);

  // 4. Render depth bathymetric contours
  useEffect(() => {
    async function renderBathy() {
      if (!mapInstanceRef.current || !bathyLayerRef.current) return;
      const L = (await import("leaflet")).default;
      bathyLayerRef.current.clearLayers();

      // Show bathymetric contours when depth is not 0m or activeLayer is bathy
      if (selectedDepth !== "0m" || activeLayer === "bathy") {
        const isobath10 = [
          [19.10, 84.80], [19.20, 84.90], [19.30, 85.02],
          [19.45, 85.20], [19.60, 85.50], [19.80, 85.90],
          [20.10, 86.60], [20.30, 86.85]
        ];
        const isobath50 = [
          [19.00, 84.95], [19.15, 85.08], [19.25, 85.22],
          [19.40, 85.45], [19.55, 85.75], [19.75, 86.15],
          [20.00, 86.85], [20.20, 87.10]
        ];

        if (selectedDepth === "-10m" || activeLayer === "bathy") {
          const line10 = L.polyline(isobath10 as any, {
            color: "#22d3ee",
            weight: selectedDepth === "-10m" ? 3 : 1.5,
            dashArray: "6, 6",
            opacity: 0.9,
          }).bindTooltip("-10m Coastal Shelf Isobath", { permanent: false });
          line10.addTo(bathyLayerRef.current);
        }

        if (selectedDepth === "-50m" || activeLayer === "bathy") {
          const line50 = L.polyline(isobath50 as any, {
            color: "#3b82f6",
            weight: selectedDepth === "-50m" ? 3 : 1.5,
            dashArray: "8, 4",
            opacity: 0.9,
          }).bindTooltip("-50m Continental Slope Edge", { permanent: false });
          line50.addTo(bathyLayerRef.current);
        }
      }
    }
    renderBathy();
  }, [selectedDepth, activeLayer]);

  // 3. Switch active layer tile overlay (e.g. RainViewer live meteorological radar)
  useEffect(() => {
    async function updateOverlay() {
      if (!mapInstanceRef.current) return;
      const L = (await import("leaflet")).default;

      // Remove existing radar overlay if any
      if (radarLayerRef.current) {
        mapInstanceRef.current.removeLayer(radarLayerRef.current);
        radarLayerRef.current = null;
      }

      if (activeLayer === "radar") {
        try {
          // Fetch latest live RainViewer radar timestamp
          const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
          const data = await res.json();
          if (data && data.radar && data.radar.past && data.radar.past.length > 0) {
            const latest = data.radar.past[data.radar.past.length - 1].path;
            const radarTile = L.tileLayer(
              `https://tilecache.rainviewer.com${latest}/256/{z}/{x}/{y}/2/1_1.png`,
              {
                opacity: 0.65,
                attribution: "Live Doppler Radar © RainViewer",
                zIndex: 10,
              }
            ).addTo(mapInstanceRef.current);
            radarLayerRef.current = radarTile;
          }
        } catch (e) {
          console.warn("Could not load RainViewer radar tiles:", e);
        }
      }
    }
    updateOverlay();
  }, [activeLayer]);

  // 4. Render PostGIS markers and polygons bound directly to [lat, lon]
  useEffect(() => {
    async function renderFeatures() {
      if (!mapInstanceRef.current || !markersLayerRef.current || !polygonsLayerRef.current) return;
      const L = (await import("leaflet")).default;

      markersLayerRef.current.clearLayers();
      polygonsLayerRef.current.clearLayers();

      // In Open World mode at national overview zoom (<= 7), render aggregated Sector Hub Badges to prevent pin clutter
      if (viewScopeMode === "open_world" && zoomLevel <= 7 && sectorHubs.length > 0) {
        sectorHubs.forEach((hub) => {
          const hubHtml = `
            <div style="cursor: pointer; display: flex; flex-direction: column; align-items: center; transition: transform 0.2s;">
              <div style="background: linear-gradient(135deg, #0b2545, #0284c7); color: white; padding: 4px 10px; border-radius: 9999px; box-shadow: 0 4px 14px rgba(0,0,0,0.6); display: flex; align-items: center; gap: 6px; border: 2px solid #38bdf8; font-family: monospace; font-size: 11px; font-weight: bold; white-space: nowrap;">
                <span class="material-symbols-outlined" style="font-size: 15px; color: #38bdf8;">hub</span>
                <span>${hub.name.replace(" Sector", "").replace(" Outpost", "")}</span>
                <span style="background: #38bdf8; color: #071322; border-radius: 9999px; padding: 0 6px; font-size: 10px; font-weight: 800;">${hub.count}</span>
              </div>
              <div style="margin-top: 2px; font-size: 9px; font-family: monospace; color: #7dd3fc; background: rgba(7, 19, 34, 0.85); padding: 1px 4px; border-radius: 3px; border: 1px solid rgba(56, 189, 248, 0.3);">
                Click to Inspect
              </div>
            </div>
          `;

          const customHubIcon = L.divIcon({
            html: hubHtml,
            className: "orca-gis-hub",
            iconSize: [140, 42],
            iconAnchor: [70, 21],
          });

          const hubMarker = L.marker(hub.center, {
            icon: customHubIcon,
            title: `${hub.name} (${hub.count} POIs)`,
          });

          hubMarker.on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            if (onSelectSectorHub) {
              onSelectSectorHub(hub);
            }
          });

          hubMarker.addTo(markersLayerRef.current!);
        });
        return;
      }

      features.forEach((feature) => {
        const isSelected = selectedFeatureId === feature.id;

        // Visual icon and styling per feature type
        let iconHtml = "";
        let markerBg = "#06b6d4"; // cyan
        let iconName = "beach_access";

        if (feature.feature_type === "beach") {
          markerBg = "#06b6d4";
          iconName = "beach_access";
        } else if (feature.feature_type === "poi") {
          markerBg = "#f59e0b";
          iconName = "fort";
        } else if (feature.feature_type === "protected_area") {
          markerBg = "#10b981";
          iconName = "shield_with_heart";
        } else if (feature.feature_type === "restricted_area") {
          markerBg = "#ea580c";
          iconName = "gavel";
        } else if (feature.feature_type === "risk_zone") {
          markerBg = "#e11d48";
          iconName = "warning";
        } else if (feature.feature_type === "activity_zone") {
          markerBg = "#0284c7";
          iconName = "surfing";
        }

        const pulseStyle = (feature.feature_type === "risk_zone" || isSelected)
          ? `<span style="position: absolute; inset: -4px; border-radius: 9999px; background-color: ${markerBg}; opacity: 0.5; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>`
          : "";

        const borderStyle = isSelected ? "border: 2.5px solid #ffffff;" : "border: 2px solid rgba(255,255,255,0.85);";
        const scaleTransform = isSelected ? "transform: scale(1.2);" : "";

        iconHtml = `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; ${scaleTransform} transition: transform 0.2s;">
            ${pulseStyle}
            <div style="width: 28px; height: 28px; border-radius: 9999px; background-color: ${markerBg}; ${borderStyle} box-shadow: 0 4px 12px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white;">
              <span class="material-symbols-outlined" style="font-size: 16px; line-height: 1;">${iconName}</span>
            </div>
            <div style="margin-top: 3px; padding: 1px 5px; border-radius: 4px; background-color: rgba(11, 28, 48, 0.92); color: #f8f9ff; font-size: 10px; font-family: monospace; white-space: nowrap; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 2px 6px rgba(0,0,0,0.3); pointer-events: none; max-width: 140px; overflow: hidden; text-overflow: ellipsis;">
              ${feature.name}
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: "orca-gis-marker",
          iconSize: [32, 44],
          iconAnchor: [16, 14], // Anchors center of circular icon directly to [lat, lon]
        });

        const marker = L.marker([feature.latitude, feature.longitude], {
          icon: customIcon,
          title: feature.name,
        });

        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectFeature(feature);
        });

        marker.addTo(markersLayerRef.current!);

        // Render Geometry Polygons if present
        if (feature.geometry && feature.geometry.type === "Polygon") {
          let polyColor = markerBg;
          let polyFillOpacity = 0.18;
          let dashArray: string | undefined = undefined;

          if (feature.feature_type === "risk_zone") {
            polyColor = "#e11d48";
            polyFillOpacity = 0.25;
            dashArray = "6, 6";
          } else if (feature.feature_type === "restricted_area") {
            polyColor = "#ea580c";
            dashArray = "8, 6";
          } else if (feature.feature_type === "protected_area") {
            polyColor = "#10b981";
            polyFillOpacity = 0.15;
          }

          // GeoJSON polygon coordinates are [lon, lat], Leaflet requires [lat, lon]
          const latLngs = feature.geometry.coordinates[0].map((coord: number[]) => [coord[1], coord[0]]);

          const polygon = L.polygon(latLngs as any, {
            color: polyColor,
            weight: 2,
            dashArray,
            fillColor: polyColor,
            fillOpacity: polyFillOpacity,
          });

          polygon.on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            onSelectFeature(feature);
          });

          polygon.addTo(polygonsLayerRef.current!);
        }
      });
    }

    renderFeatures();
  }, [features, selectedFeatureId, onSelectFeature, viewScopeMode, zoomLevel, sectorHubs, onSelectSectorHub]);

  return (
    <div
      ref={mapContainerRef}
      className="absolute inset-0 w-full h-full z-0 bg-[#071322]"
      style={{ isolation: "isolate" }}
    />
  );
}
