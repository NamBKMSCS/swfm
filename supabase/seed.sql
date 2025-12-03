INSERT INTO
    "public"."stations" (
        "id",
        "station_code",
        "name",
        "latitude",
        "longitude",
        "region",
        "created_at",
        "country",
        "river",
        "alarm_level",
        "flood_level",
        "is_deleted"
    )
VALUES (
        '1',
        '092600',
        'Jinghong',
        '22.02',
        '100.79',
        null,
        '2025-11-29 03:20:22.680455+00',
        'China',
        null,
        null,
        null,
        'false'
    ),
    (
        '2',
        '010501',
        'Chiang Saen',
        '20.27',
        '100.08',
        null,
        '2025-11-29 03:20:22.680455+00',
        'Thailand',
        null,
        null,
        null,
        'false'
    ),
    (
        '3',
        '011201',
        'Luang Prabang',
        '19.88',
        '102.14',
        null,
        '2025-11-29 03:20:22.680455+00',
        'LaoPDR',
        null,
        null,
        null,
        'false'
    ),
    (
        '4',
        '011901',
        'Vientiane',
        '17.97',
        '102.61',
        null,
        '2025-11-29 03:20:22.680455+00',
        'LaoPDR',
        null,
        null,
        null,
        'false'
    ),
    (
        '5',
        '012703',
        'Pakse',
        '15.12',
        '105.8',
        null,
        '2025-11-29 03:20:22.680455+00',
        'LaoPDR',
        null,
        null,
        null,
        'false'
    ),
    (
        '6',
        '014501',
        'Stung Treng',
        '13.57',
        '105.97',
        null,
        '2025-11-29 03:20:22.680455+00',
        'Cambodia',
        null,
        null,
        null,
        'false'
    ),
    (
        '7',
        '014901',
        'Kratie',
        '12.49',
        '106.02',
        null,
        '2025-11-29 03:20:22.680455+00',
        'Cambodia',
        'Mekong',
        '22',
        '23',
        'false'
    ),
    (
        '8',
        '019803',
        'Tan Chau',
        '10.78',
        '105.24',
        null,
        '2025-11-29 03:20:22.680455+00',
        'VietNam',
        null,
        null,
        null,
        'false'
    ),
    (
        '9',
        '039801',
        'Chau Doc',
        '10.7',
        '105.05',
        null,
        '2025-11-29 03:20:22.680455+00',
        'VietNam',
        'Bassac',
        '3',
        '4',
        'false'
    );

-- Seed role_permissions table with the default role-to-permission mappings
-- This is critical for RLS policies to work correctly

-- Admin role permissions (all permissions)
INSERT INTO
    "public"."role_permissions" ("role", "permission")
VALUES ('admin', 'users.manage'),
    ('admin', 'data.manage'),
    ('admin', 'models.tune'),
    ('admin', 'data.download')
ON CONFLICT ("role", "permission") DO NOTHING;

-- Data Scientist role permissions (limited permissions)
INSERT INTO
    "public"."role_permissions" ("role", "permission")
VALUES (
        'data_scientist',
        'models.tune'
    ),
    (
        'data_scientist',
        'data.download'
    )
ON CONFLICT ("role", "permission") DO NOTHING;