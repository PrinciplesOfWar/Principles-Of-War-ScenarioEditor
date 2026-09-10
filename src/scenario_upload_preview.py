from json import dump, load
from os import listdir, makedirs, path
from sys import exit

from inquirer import Confirm, List, Password, Text, prompt
from requests import post, put

from src.types.enums import Stage

BASE_DIR = path.dirname(path.abspath(__file__))
ROOT_DIR = path.abspath(path.join(BASE_DIR, ".."))
SCENARIOS_DIR = path.join(ROOT_DIR, "scenarios")
SCENARIOS_PREVIEW_DIR = path.join(ROOT_DIR, "scenarios_preview")

CACHE_DIR = path.join(ROOT_DIR, ".cache")
TOKEN_FILE = path.join(CACHE_DIR, "jwt_token.json")
makedirs(CACHE_DIR, exist_ok=True)

server_urls = {
    Stage.DEV.value: "https://web-server-dev.principles-of-war.com",
    Stage.PROD.value: "https://web-server.principles-of-war.com",
}


def get_cached_token(stage):
    if path.exists(TOKEN_FILE):
        try:
            with open(TOKEN_FILE, "r") as f:
                data = load(f)
            return data.get(stage)
        except Exception:
            pass
    return None


def save_token(stage, jwt_token):
    data = {}
    if path.exists(TOKEN_FILE):
        try:
            with open(TOKEN_FILE, "r") as f:
                data = load(f)
        except Exception:
            pass
    data[stage] = jwt_token
    with open(TOKEN_FILE, "w") as f:
        dump(data, f)


def run():

    values = prompt(
        [
            List(name="filename", message="scenario", choices=listdir(SCENARIOS_DIR)),
            List(
                name="stage", message="stage", choices=[value.value for value in Stage]
            ),
        ]
    )

    filename = f"{values["filename"][:-5]}.png"
    stage = values["stage"]
    server_url = server_urls[stage]

    jwt_token = get_cached_token(stage)

    if jwt_token:
        use_cached = prompt(
            [
                Confirm(
                    name="use_cached",
                    message=f"Cached credentials found for '{stage}'. Use them?",
                    default=True,
                )
            ]
        )["use_cached"]

        if use_cached:
            print("[INFO] Using cached JWT token")
        else:
            jwt_token = None

    if not jwt_token:
        credentials = prompt(
            [
                Text(name="email", message="email"),
                Password(name="password", message="password"),
            ]
        )
        email = credentials["email"]
        password = credentials["password"]

        response = None
        try:
            print(f"[INFO] POST {server_url}/users/signin")
            response = post(
                url=f"{server_url}/users/signin",
                json={"email": email, "password": password},
            )

            print(response)
            print(response.json())

            if response.status_code == 200:
                print("[INFO] authenticated")
                jwt_token = response.json()["jwt_token"]
                save_token(stage, jwt_token)
            else:
                exit()
        except:
            print("[ERROR] server offline")
            exit()

    if filename not in listdir(SCENARIOS_PREVIEW_DIR):
        print(f"[ERROR] invalid filename '{filename}'")
        exit()

    try:
        with open(f"{SCENARIOS_PREVIEW_DIR}/{filename}", "rb") as file:
            print(f"[INFO] PUT {server_url}/scenarios/preview/{filename[:-4]}")
            response = put(
                url=f"{server_url}/scenarios/preview/{filename[:-4]}",
                data=file,
                headers={
                    "Authorization": f"Bearer {jwt_token}",
                    "Content-Type": "image/png",
                },
            )

            print(response)
            print(response.json())

    except FileNotFoundError:
        print(
            f"[ERROR] could not open preview file '{SCENARIOS_PREVIEW_DIR}/{filename}'"
        )
        exit()
    except Exception as e:
        print(f"[ERROR] upload failed: {e}")
        exit()

    exit()
