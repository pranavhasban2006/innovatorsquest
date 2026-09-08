import math

class GridMap:
    def __init__(self, min_lat=34.09580, max_lat=34.09760, min_lng=-118.19276, max_lng=-118.19036, rows=40, cols=40):
        self.min_lat = min_lat
        self.max_lat = max_lat
        self.min_lng = min_lng
        self.max_lng = max_lng
        self.rows = rows
        self.cols = cols
        self.grid = [[1.0 for _ in range(cols)] for _ in range(rows)]

    def latlng_to_cell(self, lat, lng):
        lat_clamped = max(self.min_lat, min(self.max_lat, lat))
        lng_clamped = max(self.min_lng, min(self.max_lng, lng))
        
        row = int(((lat_clamped - self.min_lat) / (self.max_lat - self.min_lat)) * (self.rows - 1))
        col = int(((lng_clamped - self.min_lng) / (self.max_lng - self.min_lng)) * (self.cols - 1))
        return row, col

    def cell_to_latlng(self, row, col):
        lat = self.min_lat + (row / (self.rows - 1)) * (self.max_lat - self.min_lat)
        lng = self.min_lng + (col / (self.cols - 1)) * (self.max_lng - self.min_lng)
        return round(lat, 5), round(lng, 5)

    def mark_hazard(self, lat, lng, radius_cells=3, cost=100.0):
        center_row, center_col = self.latlng_to_cell(lat, lng)
        for r in range(center_row - radius_cells, center_row + radius_cells + 1):
            for c in range(center_col - radius_cells, center_col + radius_cells + 1):
                if 0 <= r < self.rows and 0 <= c < self.cols:
                    dist = math.hypot(r - center_row, c - center_col)
                    if dist <= radius_cells:
                        self.grid[r][c] = cost

    def get_cost(self, row, col):
        if 0 <= row < self.rows and 0 <= col < self.cols:
            return self.grid[row][col]
        return float('inf')
