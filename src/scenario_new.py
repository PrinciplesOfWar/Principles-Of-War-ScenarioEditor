from json import dump
from os import makedirs, path

from inquirer import Text, prompt

BASE_DIR = path.dirname(path.abspath(__file__))
ROOT_DIR = path.abspath(path.join(BASE_DIR, ".."))
SCENARIOS_DATA_DIR = path.join(ROOT_DIR, "scenarios_data")


def run():

    values = prompt(
        [
            Text(
                "scenario_id",
                "Scenario ID",
            ),
            Text(
                "scenario_name",
                "Scenario name",
            ),
            Text(
                "creator",
                "Creator",
            ),
        ]
    )

    scenario_id = values["scenario_id"].strip()
    scenario_name = values["scenario_name"].strip()
    creator = values["creator"].strip()

    # Create scenario folder
    scenario_dir = path.join(SCENARIOS_DATA_DIR, scenario_id)
    unit_icons_dir = path.join(scenario_dir, "unit_icons")
    makedirs(unit_icons_dir, exist_ok=True)

    # Create description.json
    description = {"description": "<DESCRIPTION>"}
    with open(path.join(scenario_dir, "description.json"), "w") as f:
        dump(description, f, indent=4)

    # Create factions.json
    factions = {
        "red": {
            "id": "faction_0",
            "name": "red",
            "manpower_points": 0,
            "manpower_income": 0,
            "manpower_cap": 0,
            "fuel_points": 0,
            "fuel_income": 0,
            "fuel_cap": 0,
            "airpower_points": 0,
            "airpower_income": 0,
            "airpower_cap": 0,
            "units_cap": 0,
        },
        "blue": {
            "id": "faction_1",
            "name": "blue",
            "manpower_points": 0,
            "manpower_income": 0,
            "manpower_cap": 0,
            "fuel_points": 0,
            "fuel_income": 0,
            "fuel_cap": 0,
            "airpower_points": 0,
            "airpower_income": 0,
            "airpower_cap": 0,
            "units_cap": 0,
        },
    }
    with open(path.join(scenario_dir, "factions.json"), "w") as f:
        dump(factions, f, indent=4)

    # Create landmarks.json
    landmarks = {"city": [], "supply": [], "oilfield": []}
    with open(path.join(scenario_dir, "landmarks.json"), "w") as f:
        dump(landmarks, f, indent=4)

    # Create scenario.tmx
    tmx_content = f"""<?xml version="1.0" encoding="UTF-8"?>
    <map version="1.9" tiledversion="1.9.2" orientation="hexagonal" renderorder="left-up" width="1" height="1" tilewidth="120" tileheight="140" infinite="0" hexsidelength="80" staggeraxis="y" staggerindex="odd" nextlayerid="10" nextobjectid="1">
    <tileset firstgid="1" source="../../resources/tsx/terrain_grass.tsx"/>
    <tileset firstgid="2" source="../../resources/tsx/terrain_water.tsx"/>
    <tileset firstgid="3" source="../../resources/tsx/terrain_mountain.tsx"/>
    <tileset firstgid="4" source="../../resources/tsx/terrain_sand.tsx"/>
    <tileset firstgid="5" source="../../resources/tsx/terrain_mud.tsx"/>
    <tileset firstgid="6" source="../../resources/tsx/terrain_snow.tsx"/>
    <tileset firstgid="7" source="../../resources/tsx/terrain_forest.tsx"/>
    <tileset firstgid="8" source="../../resources/tsx/faction_n.tsx"/>
    <tileset firstgid="9" source="../../resources/tsx/faction_0.tsx"/>
    <tileset firstgid="10" source="../../resources/tsx/faction_1.tsx"/>
    <tileset firstgid="11" source="../../resources/tsx/landmark_default.tsx"/>
    <tileset firstgid="12" source="../../resources/tsx/landmark_city.tsx"/>
    <tileset firstgid="13" source="../../resources/tsx/landmark_depot.tsx"/>
    <tileset firstgid="14" source="../../resources/tsx/landmark_oilfield.tsx"/>
    <tileset firstgid="15" source="../../resources/tsx/railway_1.tsx"/>
    <tileset firstgid="16" source="../../resources/tsx/railway_0.tsx"/>
    <tileset firstgid="17" source="../../resources/tsx/river_0.tsx"/>
    <tileset firstgid="18" source="../../resources/tsx/river_1.tsx"/>
    <tileset firstgid="19" source="../../resources/tsx/river_2.tsx"/>
    <tileset firstgid="20" source="../../resources/tsx/river_3.tsx"/>
    <tileset firstgid="21" source="../../resources/tsx/river_4.tsx"/>
    <tileset firstgid="22" source="../../resources/tsx/river_5.tsx"/>
    <tileset firstgid="23" source="../../resources/tsx/river_6.tsx"/>
    <tileset firstgid="24" source="../../resources/tsx/river_7.tsx"/>
    <tileset firstgid="25" source="../../resources/tsx/objective_0.tsx"/>
    <tileset firstgid="26" source="../../resources/tsx/objective_1.tsx"/>
    <tileset firstgid="27" source="../../resources/tsx/port_0.tsx"/>
    <tileset firstgid="28" source="../../resources/tsx/port_1.tsx"/>
    <objectgroup id="5" name="metadata">
      <properties>
      <property name="creator" value="{creator}"/>
      <property name="filename" value="{scenario_id}.json"/>
      <property name="id" value="{scenario_id}"/>
      <property name="name" value="{scenario_name}"/>
      </properties>
    </objectgroup>
    <layer id="8" name="objective_faction_1" width="1" height="1">
      <data encoding="csv">
    25
    </data>
    </layer>
    <layer id="7" name="objective_faction_0" width="1" height="1">
      <data encoding="csv">
    25
    </data>
    </layer>
    <layer id="4" name="landmark" width="1" height="1">
      <data encoding="csv">
    11
    </data>
    </layer>
    <layer id="3" name="railway" width="1" height="1">
      <data encoding="csv">
    16
    </data>
    </layer>
    <layer id="6" name="river" width="1" height="1">
      <data encoding="csv">
    17
    </data>
    </layer>
    <layer id="2" name="front" width="1" height="1">
      <data encoding="csv">
    8
    </data>
    </layer>
    <layer id="1" name="terrain" width="1" height="1">
      <data encoding="csv">
    2
    </data>
    </layer>
    <layer id="9" name="port" width="1" height="1">
      <data encoding="csv">
    27
    </data>
    </layer>
    </map>
  """

    with open(path.join(scenario_dir, "scenario.tmx"), "w") as f:
        f.write(tmx_content)

    # time.json
    time_data = {"day": 1, "month": 1, "year": 2025, "increment": 1, "seasons": {}}
    with open(path.join(scenario_dir, "time.json"), "w") as f:
        dump(time_data, f, indent=4)

    # turn.json
    turn_data = {"duration": 1000}
    with open(path.join(scenario_dir, "turn.json"), "w") as f:
        dump(turn_data, f, indent=4)

    # unit_types.json
    unit_types = {
        "red_infantry": {
            "id": "red_infantry",
            "name": "Red Infantry",
            "description": "",
            "faction": "red",
            "branch": "infantry",
            "icon": "red_infantry",
            "attack": 1,
            "defense": 2,
            "movement": 2,
            "cost": 3,
            "fuel_consumption": 0,
            "frequency": 5,
        },
        "blue_infantry": {
            "id": "blue_infantry",
            "name": "Blue Infantry",
            "description": "",
            "faction": "blue",
            "branch": "infantry",
            "icon": "blue_infantry",
            "attack": 1,
            "defense": 2,
            "movement": 2,
            "cost": 3,
            "fuel_consumption": 0,
            "frequency": 5,
        },
    }
    with open(path.join(scenario_dir, "unit_types.json"), "w") as f:
        dump(unit_types, f, indent=4)

    # units.json
    with open(path.join(scenario_dir, "units.json"), "w") as f:
        dump([], f, indent=4)

    print(
        f"[INFO] New scenario '{scenario_dir}' created successfully in '{scenario_dir}'."
    )
