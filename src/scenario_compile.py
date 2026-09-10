from base64 import b64encode
from hashlib import md5
from json import dump, dumps, load
from os import listdir, path
from sys import exit
from time import time
from xml.etree import ElementTree

from inquirer import List, prompt

from src.models.scenario_object import ScenarioObject

BASE_DIR = path.dirname(path.abspath(__file__))
ROOT_DIR = path.abspath(path.join(BASE_DIR, ".."))
SCENARIOS_DIR = path.join(ROOT_DIR, "scenarios")
SCENARIOS_DATA_DIR = path.join(ROOT_DIR, "scenarios_data")
RESOURCES_DIR = path.join(ROOT_DIR, "resources")

cy = None
cx = None


class ScenarioCompile:

    def __init__(self, scenario_id):

        self.scenario = ScenarioObject()
        self.scenario_id = scenario_id
        self.path = f"{SCENARIOS_DATA_DIR}/{scenario_id}/"

        try:
            self.tree_root = ElementTree.parse(self.path + "scenario.tmx").getroot()
        except:
            print(
                f"[ERROR] error when parsing {SCENARIOS_DATA_DIR}/{scenario_id}/scenario.tmx"
            )
            exit()

        try:
            metadata = self.get_xml_element("objectgroup", "metadata").find(
                "properties"
            )
        except:
            print(
                f"[ERROR] missing or invalid 'metadata' layer in {SCENARIOS_DATA_DIR}/{scenario_id}/scenario.tmx"
            )
            exit()

        factions_data = self.load_json(self.path + "factions.json")
        unit_types = self.load_json(self.path + "unit_types.json")
        units_data = self.load_json(self.path + "units.json")
        time_data = self.load_json(self.path + "time.json")
        turn_data = self.load_json(self.path + "turn.json")
        landmark_detail_data = self.load_json(self.path + "landmarks.json")
        description_data = self.load_json(self.path + "description.json")

        terrain_data = self.get_xml_array("layer", "terrain", 1)
        front_data = self.get_xml_array("layer", "front", 8)
        landmark_data = self.get_xml_array("layer", "landmark", 11)
        railway_data = self.get_xml_array("layer", "railway", 15)
        river_data = self.get_xml_array("layer", "river", 17)
        port_data = self.get_xml_array("layer", "port", 27)
        obj_f0_data = self.get_xml_array("layer", "objective_faction_0", 25)
        obj_f1_data = self.get_xml_array("layer", "objective_faction_1", 25)

        self.scenario.create_metadata(id=self.get_xml_properties(metadata, "id"))
        self.scenario.create_metadata(
            filename=self.get_xml_properties(metadata, "filename")
        )
        self.scenario.create_metadata(name=self.get_xml_properties(metadata, "name"))
        self.scenario.create_metadata(
            creator=self.get_xml_properties(metadata, "creator")
        )
        self.scenario.create_metadata(width=int(self.tree_root.attrib["width"]))
        self.scenario.create_metadata(height=int(self.tree_root.attrib["height"]))
        self.scenario.create_metadata(type="original")
        self.scenario.create_metadata(description=description_data["description"])

        self.scenario.create_time(**time_data)
        self.scenario.create_turn(**turn_data)

        for faction in factions_data.values():
            self.scenario.create_faction(**faction)

        for filename in listdir(self.path + "unit_icons"):
            if not filename.endswith(".png"):
                continue
            with open(self.path + "unit_icons/" + filename, "rb") as icon:
                icon_binary = icon.read()
                self.scenario.create_unit_icon(
                    filename[:-4], b64encode(icon_binary).decode("utf-8")
                )
        with open(f"{RESOURCES_DIR}/unit/unknown.png", "rb") as icon:
            icon_binary = icon.read()
            self.scenario.create_unit_icon(
                "unknown", b64encode(icon_binary).decode("utf-8")
            )

        for unit_type in unit_types.values():
            self.scenario.create_unit_type(**unit_type)

        for unit in units_data:
            self.scenario.create_unit(**unit)

        for y in range(self.scenario.data["metadata"]["height"]):
            for x in range(self.scenario.data["metadata"]["width"]):
                global cx
                global cy
                cx = x
                cy = y
                self.scenario.create_hexagon(
                    x,
                    y,
                    self.get_terrain_by_value(terrain_data[y][x]),
                    self.get_faction_by_value(front_data[y][x]),
                    self.get_landmark_by_value(landmark_data[y][x]),
                    self.get_railway_by_value(railway_data[y][x]),
                    self.get_river_by_value(river_data[y][x]),
                    self.get_port_by_value(port_data[y][x]),
                    self.get_objective_by_value(obj_f0_data[y][x]),
                    self.get_objective_by_value(obj_f1_data[y][x]),
                )

        for city in landmark_detail_data["city"]:
            self.scenario.create_landmark(landmark_type="city", **city)
        for oilfield in landmark_detail_data["oilfield"]:
            self.scenario.create_landmark(landmark_type="oilfield", **oilfield)
        for supply in landmark_detail_data["supply"]:
            self.scenario.create_landmark(landmark_type="supply", **supply)

        hash = md5(dumps(self.scenario.data, sort_keys=True).encode("utf8")).hexdigest()
        self.scenario.create_metadata(hash=hash)
        self.scenario.create_metadata(timestamp=int(time()))

    def get_xml_properties(self, properties, key):
        for property in properties.findall("property"):
            if property.attrib.get("name") == key:
                return property.attrib.get("value")
        print(f"WARNING: get_xml_properties: could not find property with name '{key}'")
        return ""

    def get_xml_element(self, tag, name):
        for child in self.tree_root:
            if child.tag == tag and child.attrib["name"] == name:
                return child

    def get_xml_array(self, tag, name, value_offset):
        for child in self.tree_root:
            if child.tag == tag and child.attrib["name"] == name:
                data = child.find("data").text
                return [
                    [(int(num) - value_offset) for num in row.split(",") if num]
                    for row in data.strip().split("\n")
                ]

    def get_terrain_by_value(self, value):
        match value:
            case 0:
                return "grass"
            case 1:
                return "water"
            case 2:
                return "mountain"
            case 3:
                return "sand"
            case 4:
                return "mud"
            case 5:
                return "snow"
            case 6:
                return "forest"
            case _:
                print(
                    f"[ERROR] get_terrain_by_value: invalid terrain value {value} (y={cy}, x={cx})"
                )

    def get_faction_by_value(self, value):
        match value:
            case 0:
                return "neutral"
            case 1:
                for dict_value in self.scenario.data["factions"].values():
                    if dict_value.get("id") == "faction_0":
                        return dict_value.get("name")
            case 2:
                for dict_value in self.scenario.data["factions"].values():
                    if dict_value.get("id") == "faction_1":
                        return dict_value.get("name")
            case _:
                print(
                    f"[ERROR] get_faction_by_value: invalid faction value {value} (y={cy}, x={cx})"
                )

    def get_landmark_by_value(self, value):
        match value:
            case 0:
                return "default"
            case 1:
                return "city"
            case 2:
                return "supply"
            case 3:
                return "oilfield"
            case _:
                print(
                    f"[ERROR] get_landmark_by_value: invalid landmark value {value} (y={cy}, x={cx})"
                )

    def get_railway_by_value(self, value):
        match value:
            case 0:
                return True
            case 1:
                return False
            case _:
                print(
                    f"[ERROR] get_railway_by_value: invalid railway value {value} (y={cy}, x={cx})"
                )

    def get_river_by_value(self, value):
        match value:
            case 0:
                return [False, False, False, False, False, False]
            case 1:
                return [True, False, False, False, False, False]
            case 2:
                return [False, True, False, False, False, False]
            case 3:
                return [False, False, True, False, False, False]
            case 4:
                return [True, True, False, False, False, False]
            case 5:
                return [True, False, True, False, False, False]
            case 6:
                return [False, True, True, False, False, False]
            case 7:
                return [True, True, True, False, False, False]
            case _:
                print(
                    f"[ERROR] get_river_by_value: invalid river value {value} (y={cy}, x={cx})"
                )

    def get_objective_by_value(self, value):
        match value:
            case 0:
                return False
            case 1:
                return True
            case _:
                print(
                    f"[ERROR] get_objective_by_value: invalid objective value {value} (y={cy}, x={cx})"
                )

    def get_port_by_value(self, value):
        match value:
            case 0:
                return False
            case 1:
                return True
            case _:
                print(
                    f"[ERROR] get_port_by_value: invalid port value {value} (y={cy}, x={cx})"
                )

    def load_json(self, path):
        with open(path, "r") as file:
            return load(file)


def run():

    values = prompt(
        [
            List("scenario_id", "scenario", listdir(SCENARIOS_DATA_DIR)),
        ]
    )

    scenario_id = values["scenario_id"]

    if scenario_id not in listdir(SCENARIOS_DATA_DIR):
        print(f"[ERROR] invalid scenario id '{scenario_id}'")
        exit()

    scenario_factory = ScenarioCompile(scenario_id)
    filename = scenario_factory.scenario.data["metadata"]["filename"]
    filepath = f"{SCENARIOS_DIR}/{filename}"
    with open(filepath, "w+") as file:
        dump(scenario_factory.scenario.data, file)
        print(f"[INFO] output '{filepath}'")
