{
  "targets": [
    {
      "target_name": "libzbxpreproc",
      "type": "static_library",
      "include_dirs": [
        "preprocessor/zabbix/include",
      ],
      "sources": [
        "./preprocessor/zabbix/src/zabbix_server/preprocessor/item_preproc.c",
        "./preprocessor/zabbix/src/zabbix_server/preprocessor/preproc_history.c",
      ]
    },
    {
      "target_name": "libzbxcommon",
      "type": "static_library",
      "include_dirs": [
        "preprocessor/zabbix/src/libs/zbxsysinfo/common",
        "preprocessor/zabbix/include",
      ],
      "sources": [
        "./preprocessor/zabbix/src/libs/zbxcommon/str.c",
        "./preprocessor/zabbix/src/libs/zbxcommon/variant.c",
        "./preprocessor/zabbix/src/libs/zbxcommon/misc.c",
        "./preprocessor/zabbix/src/libs/zbxcommon/variant_misc.c",
      ]
    },
    {
      "target_name": "db4bix_preproc",
      "sources": [
        "preprocessor/binding.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "preprocessor/zabbix/src/zabbix_server/preprocessor",
        "preprocessor/zabbix/include",
        "preprocessor/zabbix/src/libs/zbxsysinfo/common",
      ],
      "libraries":[
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")",
        "libzbxpreproc",
        "libzbxcommon",
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      'conditions': [
        ['OS=="mac"', {
          'xcode_settings': {
            'GCC_ENABLE_CPP_EXCEPTIONS': 'YES'
          }
        }]
      ],
      "defines": ["NAPI_CPP_EXCEPTIONS"]
    }
  ]
}