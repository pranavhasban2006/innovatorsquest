import math
import heapq
from grid_map import GridMap

def haversine_distance(lat1, lng1, lat2, lng2):
    R = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlamb = math.radians(lng2 - lng1)
    
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlamb / 2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def a_star(grid_map, start_cell, goal_cell):
    """
    8-directional A* search.
    Returns (path_cells, total_cost) or (None, None) if unreachable.
    """
    start_row, start_col = start_cell
    goal_row, goal_col = goal_cell
    
    if not (0 <= start_row < grid_map.rows and 0 <= start_col < grid_map.cols):
        return None, None
    if not (0 <= goal_row < grid_map.rows and 0 <= goal_col < grid_map.cols):
        return None, None
        
    goal_lat, goal_lng = grid_map.cell_to_latlng(goal_row, goal_col)
    
    def heuristic(r, c):
        cur_lat, cur_lng = grid_map.cell_to_latlng(r, c)
        return haversine_distance(cur_lat, cur_lng, goal_lat, goal_lng)

    neighbors = [
        (-1, 0), (1, 0), (0, -1), (0, 1),
        (-1, -1), (-1, 1), (1, -1), (1, 1)
    ]
    
    open_set = []
    start_h = heuristic(start_row, start_col)
    heapq.heappush(open_set, (start_h, 0.0, (start_row, start_col), [(start_row, start_col)]))
    
    visited = {}
    
    while open_set:
        f, g, current, path = heapq.heappop(open_set)
        
        if current in visited and visited[current] <= g:
            continue
        visited[current] = g
        
        if current == (goal_row, goal_col):
            return path, g
            
        r, c = current
        for dr, dc in neighbors:
            nr, nc = r + dr, c + dc
            if 0 <= nr < grid_map.rows and 0 <= nc < grid_map.cols:
                cell_cost = grid_map.get_cost(nr, nc)
                if math.isinf(cell_cost):
                    continue
                    
                step_dist = 1.414 if (dr != 0 and dc != 0) else 1.0
                step_cost = step_dist * cell_cost
                new_g = g + step_cost
                
                neighbor = (nr, nc)
                if neighbor not in visited or new_g < visited[neighbor]:
                    new_f = new_g + heuristic(nr, nc)
                    heapq.heappush(open_set, (new_f, new_g, neighbor, path + [neighbor]))
                    
    return None, None
