import json

MANIFEST_PATH = 'manifest.json'


def rewrite_manifest():
  with open(MANIFEST_PATH, 'r+') as f:
    data = json.load(f)
    version = data['version'].split('.')
    version[2] = str(int(version[2]) + 1)
    version = '.'.join(version)
    data['version'] = version
    f.seek(0)
    json.dump(data, f, indent=4, sort_keys=True)
    f.truncate()
    print version


def main():
  """
    update the manifest.json to increase the version number
  """

  rewrite_manifest()

if __name__ == '__main__':
  main()
