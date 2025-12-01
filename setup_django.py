import os

dirs = [
    'teleclinic',
    'teleclinic/apps',
    'teleclinic/apps/core',
    'teleclinic/apps/doctors',
    'teleclinic/apps/patients',
    'teleclinic/apps/meetings',
]

for d in dirs:
    os.makedirs(d, exist_ok=True)
    init_file = os.path.join(d, '__init__.py')
    if not os.path.exists(init_file):
        open(init_file, 'w').close()

print("Django structure created successfully")
