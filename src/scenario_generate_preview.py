from json import load
from os import listdir, path
from random import Random, randint

from inquirer import List, prompt
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = path.dirname(path.abspath(__file__))
ROOT_DIR = path.abspath(path.join(BASE_DIR, ".."))
SCENARIOS_DIR = path.join(ROOT_DIR, "scenarios")
SCENARIOS_DATA_DIR = path.join(ROOT_DIR, "scenarios_data")
SCENARIOS_PREVIEW_DIR = path.join(ROOT_DIR, "scenarios_preview")

RESOURCES_DIR = path.join(ROOT_DIR, "resources")

HEXAGON_CORNERS = ((60, 0), (120, 33), (120, 107), (60, 140), (0, 107), (0, 33))

TERRAIN_VARIATIONS = {
    "forest": 1,
    "forest_snow": 1,
    "grass": 5,
    "mountain": 1,
    "mud": 1,
    "sand": 1,
    "snow": 1,
    "water": 4,
}


class ScenarioPreview:

    def __init__(self, scenario_id, day):
        self.scenario_id = scenario_id
        self.day = day

        self.hexagons = []
        self.cities = []

        self.hexagon_w = 0
        self.hexagon_h = 0
        self.pixel_w = 0
        self.pixel_h = 0

        self.hex_lookup = {}

        self.images = {
            "terrain": {
                "grass": [],
                "forest": [],
                "forest_snow": [],
                "mountain": [],
                "water": [],
                "snow": [],
                "sand": [],
                "mud": [],
            },
            "landmark": {},
            "river": [],
        }

        self.canvas = None
        self.draw = None
        self.font = ImageFont.truetype("arial.ttf", 40)

    def load_terrain_images(self):
        for terrain in listdir(path.join(RESOURCES_DIR, "terrain")):
            for image_filename in listdir(path.join(RESOURCES_DIR, "terrain", terrain)):
                image = Image.open(
                    path.join(RESOURCES_DIR, "terrain", terrain, image_filename)
                ).convert("RGBA")
                key = image_filename[:-4]
                self.images["terrain"][terrain].append(image)

        for image_filename in listdir(path.join(RESOURCES_DIR, "landmark")):
            image = Image.open(
                path.join(RESOURCES_DIR, "landmark", image_filename)
            ).convert("RGBA")
            key = image_filename[:-4]
            self.images["landmark"][key] = image

        for image_filename in listdir(path.join(RESOURCES_DIR, "river")):
            image = Image.open(
                path.join(RESOURCES_DIR, "river", image_filename)
            ).convert("RGBA")
            self.images["river"].append(image)

    def load_scenario_data(self):
        with open(f"{SCENARIOS_DIR}/{self.scenario_id}.json", "r") as file:
            data = load(file)
        self.hexagons = data["hexagons"]
        self.cities = data["landmarks"]["city"]
        self.time = data["time"]
        self.hexagon_w = data["metadata"]["width"]
        self.hexagon_h = data["metadata"]["height"]
        self.pixel_w = self.hexagon_w * 120 + 60
        self.pixel_h = self.hexagon_h * 107 + 33

        self.hex_lookup = {(h["x"], h["y"]): h for h in self.hexagons}
        self.canvas = Image.new("RGBA", (self.pixel_w, self.pixel_h), (0, 0, 0, 0))
        self.draw = ImageDraw.Draw(self.canvas)

    def draw_hexagons(self):

        for hexagon in self.hexagons:
            ix = hexagon["x"]
            iy = hexagon["y"]
            terrain = hexagon["terrain_current"]
            landmark = hexagon["landmark"]

            px = ix * 120 + (iy % 2) * 60
            py = iy * 107

            terrain_img = self.images["terrain"][terrain][
                randint(0, TERRAIN_VARIATIONS[terrain] - 1)
            ]
            landmark_img = self.images["landmark"][landmark]

            self.canvas.paste(terrain_img, (px, py), terrain_img)

            if iy % 2 == 0 and ix + 1 == self.hexagon_w:
                self.canvas.paste(terrain_img, (px + 120, py), terrain_img)

            if iy % 2 == 1 and ix == 0:
                self.canvas.paste(terrain_img, (px - 120, py), terrain_img)

            if iy == 0:
                self.canvas.paste(terrain_img, (px - 60, py - 107), terrain_img)
                if ix + 1 == self.hexagon_w:
                    self.canvas.paste(terrain_img, (px + 60, py - 107), terrain_img)

            if iy + 1 == self.hexagon_h:
                self.canvas.paste(terrain_img, (px - 60, py + 107), terrain_img)
                if ix + 1 == self.hexagon_w:
                    self.canvas.paste(terrain_img, (px + 60, py + 107), terrain_img)

            if landmark == "default":
                continue

            self.canvas.paste(landmark_img, (px, py), landmark_img)

    def draw_city_names(self):
        for city in self.cities:
            ix = city["x"]
            iy = city["y"]
            name = city["name"]

            bbox = self.draw.textbbox((0, 0), name, font=self.font)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]

            px = ix * 120 + (iy % 2) * 60 + 60 - text_w // 2
            py = iy * 107

            self.draw.rectangle(
                (px, py + 80, px + text_w, py + 80 + text_h + 10),
                fill=(0, 0, 0, 255),
            )
            self.draw.text(
                (px, py + 80), name, fill=(255, 255, 255, 255), font=self.font
            )

    def draw_rivers(self):

        for hexagon in self.hexagons:
            ix = hexagon["x"]
            iy = hexagon["y"]
            river = hexagon["river"]

            px = ix * 120 + (iy % 2) * 60
            py = iy * 107

            for index, value in enumerate(river):

                if not value:
                    continue

                (cpx1, cpy1) = HEXAGON_CORNERS[index]
                (cpx2, cpy2) = HEXAGON_CORNERS[(index + 1) % 6]

                self.draw.line(
                    [(px + cpx1, py + cpy1), (px + cpx2, py + cpy2)],
                    fill=(0, 0, 255),
                    width=12,
                )

    def draw_railway(self):
        for hexagon in self.hexagons:
            ix = hexagon["x"]
            iy = hexagon["y"]
            railway = hexagon["railway"]

            if not railway:
                continue

            if iy % 2 == 0:
                neighbor_coords = [
                    (ix, iy - 1),
                    (ix + 1, iy),
                    (ix, iy + 1),
                    (ix - 1, iy + 1),
                    (ix - 1, iy),
                    (ix - 1, iy - 1),
                ]
            else:
                neighbor_coords = [
                    (ix + 1, iy - 1),
                    (ix + 1, iy),
                    (ix + 1, iy + 1),
                    (ix, iy + 1),
                    (ix - 1, iy),
                    (ix, iy - 1),
                ]

            railways = [False, False, False, False, False, False]
            for i, (nx, ny) in enumerate(neighbor_coords):
                neighbor = self.hex_lookup.get((nx, ny))
                if neighbor and neighbor["railway"]:
                    railways[i] = True

            px = ix * 120 + (iy % 2) * 60
            py = iy * 107

            (cpx1, cpy1) = (60, 70)

            for index, value in enumerate(railways):
                if not value:
                    continue

                hc1 = HEXAGON_CORNERS[index]
                hc2 = HEXAGON_CORNERS[(index + 1) % 6]

                (cpx2, cpy2) = ((hc1[0] + hc2[0]) / 2, (hc1[1] + hc2[1]) / 2)

                self.draw.line(
                    [(px + cpx1, py + cpy1), (px + cpx2, py + cpy2)],
                    fill=(0, 0, 0),
                    width=12,
                )

    def process_seasons(self):
        for hexagon in self.hexagons:
            hexagon["terrain_current"] = hexagon["terrain"]

        if not self.time["seasons"]:
            return

        month_days = {
            1: 31,
            2: 28,
            3: 31,
            4: 30,
            5: 31,
            6: 30,
            7: 31,
            8: 31,
            9: 30,
            10: 31,
            11: 30,
            12: 31,
        }

        seasons = {}
        for key, value in self.time["seasons"].items():
            d_str, m_str = key.split("-")
            d, m = int(d_str), int(m_str)
            day_of_year = sum(month_days[i] for i in range(1, m)) + d
            seasons[day_of_year] = value

        current_day = self.time["day"]
        current_month = self.time["month"]

        target_doy = sum(month_days[i] for i in range(1, current_month)) + current_day

        sim_doy = target_doy
        total_steps = 365
        increment = self.time.get("increment", 1)

        random_gen = Random(1337)

        steps_taken = 0
        while steps_taken < total_steps:
            start_day = sim_doy
            end_day = sim_doy + increment

            for check_day in range(start_day, end_day):
                actual_doy = ((check_day - 1) % 365) + 1

                if actual_doy in seasons:
                    rules = seasons[actual_doy]
                    for hexagon in self.hexagons:
                        terrain_type = hexagon["terrain"]
                        if terrain_type in rules:
                            rule = rules[terrain_type]
                            if random_gen.uniform(0, 1) <= rule["probability"]:
                                hexagon["terrain_current"] = rule["to"]

            sim_doy += increment
            steps_taken += increment

    def save_canvas(self):
        self.canvas.save(path.join(SCENARIOS_PREVIEW_DIR, f"{self.scenario_id}.png"))


def run():

    values = prompt(
        [
            List("scenario_id", "scenario", listdir(SCENARIOS_DATA_DIR)),
        ]
    )

    scenario_id = values["scenario_id"]

    scenario_preview = ScenarioPreview(scenario_id, 0)
    scenario_preview.load_terrain_images()
    scenario_preview.load_scenario_data()
    scenario_preview.process_seasons()
    scenario_preview.draw_hexagons()
    scenario_preview.draw_rivers()
    scenario_preview.draw_railway()
    scenario_preview.draw_city_names()
    scenario_preview.save_canvas()
