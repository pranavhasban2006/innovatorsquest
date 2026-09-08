import unittest
from grid_map import GridMap
from pathfinding import a_star

class TestPathfinding(unittest.TestCase):
    def test_straight_line_path(self):
        g = GridMap(rows=10, cols=10)
        start = (0, 0)
        goal = (0, 5)
        path, cost = a_star(g, start, goal)
        self.assertIsNotNone(path)
        self.assertEqual(len(path), 6)
        self.assertEqual(cost, 5.0)

    def test_obstacle_avoidance(self):
        g = GridMap(rows=10, cols=10)
        # Block cell (0, 2)
        g.grid[0][2] = float('inf')
        start = (0, 0)
        goal = (0, 4)
        path, cost = a_star(g, start, goal)
        self.assertIsNotNone(path)
        # Path must not contain blocked cell (0, 2)
        self.assertNotIn((0, 2), path)

    def test_unreachable_boxed_in(self):
        g = GridMap(rows=10, cols=10)
        # Surround goal (5, 5) with inf
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                if dr == 0 and dc == 0: continue
                g.grid[5 + dr][5 + dc] = float('inf')
        start = (0, 0)
        goal = (5, 5)
        path, cost = a_star(g, start, goal)
        self.assertIsNone(path)
        self.assertIsNone(cost)

if __name__ == '__main__':
    unittest.main()
