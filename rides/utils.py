import math
import json

def haversine_distance_km(lat1, lon1, lat2, lon2):
    """
    Calcula la distancia Haversine en kilómetros entre dos puntos de coordenadas (lat, lon).
    """
    R = 6371.0  # Radio medio de la Tierra en km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def distance_point_to_segment_km(plat, plon, lat1, lon1, lat2, lon2):
    """
    Calcula la distancia mínima en kilómetros desde un punto P(plat, plon)
    hasta el segmento de recta AB((lat1, lon1), (lat2, lon2)).
    """
    avg_lat_rad = math.radians((lat1 + lat2 + plat) / 3.0)
    kx = math.cos(avg_lat_rad)
    
    dx = (lon2 - lon1) * 111.0 * kx
    dy = (lat2 - lat1) * 111.0
    
    px = (plon - lon1) * 111.0 * kx
    py = (plat - lat1) * 111.0
    
    segment_len_sq = dx * dx + dy * dy
    if segment_len_sq == 0:
        return haversine_distance_km(plat, plon, lat1, lon1)
    
    t = (px * dx + py * dy) / segment_len_sq
    t = max(0.0, min(1.0, t))
    
    q_lat = lat1 + (t * (lat2 - lat1))
    q_lon = lon1 + (t * (lon2 - lon1))
    
    return haversine_distance_km(plat, plon, q_lat, q_lon)

def min_distance_to_polyline_km(plat, plon, polyline_data):
    """
    Calcula la distancia mínima en km desde la ubicación del pasajero
    hasta cualquier punto o segmento de la polyline trazada por el conductor.
    """
    if not polyline_data:
        return float('inf')
    
    coords = polyline_data
    if isinstance(polyline_data, str):
        try:
            parsed = json.loads(polyline_data)
            if isinstance(parsed, dict) and 'coordinates' in parsed:
                coords = parsed['coordinates']
            elif isinstance(parsed, list):
                coords = parsed
            else:
                return float('inf')
        except (json.JSONDecodeError, ValueError):
            return float('inf')
            
    if not isinstance(coords, list) or len(coords) == 0:
        return float('inf')
        
    min_dist = float('inf')
    
    for i in range(len(coords)):
        pt = coords[i]
        if not isinstance(pt, (list, tuple)) or len(pt) < 2:
            continue
        c_lon, c_lat = float(pt[0]), float(pt[1])
        
        dist_pt = haversine_distance_km(plat, plon, c_lat, c_lon)
        if dist_pt < min_dist:
            min_dist = dist_pt
            
        if i < len(coords) - 1:
            next_pt = coords[i + 1]
            if isinstance(next_pt, (list, tuple)) and len(next_pt) >= 2:
                n_lon, n_lat = float(next_pt[0]), float(next_pt[1])
                dist_seg = distance_point_to_segment_km(plat, plon, c_lat, c_lon, n_lat, n_lon)
                if dist_seg < min_dist:
                    min_dist = dist_seg
                    
    return min_dist

def is_journey_near_passenger(passenger_lat, passenger_lng, journey, max_origin_radius_km=3.0, max_route_radius_km=2.0):
    """
    Evalúa si un viaje cumple con los criterios de cercanía para el pasajero.
    """
    route = journey.id_route_journey_i
    origin = route.id_address_origin_i
    
    orig_lat = float(origin.latitude_d)
    orig_lng = float(origin.longitude_d)
    
    dist_origin = haversine_distance_km(passenger_lat, passenger_lng, orig_lat, orig_lng)
    dist_route = min_distance_to_polyline_km(passenger_lat, passenger_lng, route.map_polyline_v)
    
    is_origin_near = (dist_origin <= max_origin_radius_km)
    is_route_near = (dist_route <= max_route_radius_km)
    
    match_type = None
    if is_origin_near and is_route_near:
        match_type = 'origin_and_route'
    elif is_origin_near:
        match_type = 'origin'
    elif is_route_near:
        match_type = 'route'
        
    return {
        'is_near': is_origin_near or is_route_near,
        'dist_origin_km': round(dist_origin, 2),
        'dist_route_km': round(dist_route, 2) if dist_route != float('inf') else None,
        'min_dist_km': round(min(dist_origin, dist_route if dist_route != float('inf') else dist_origin), 2),
        'match_type': match_type
    }
