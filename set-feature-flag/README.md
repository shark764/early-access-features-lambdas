### Usage

* **lambda**
  * **set-feature-flag**
    
    The set-feature-flag lambda makes reference and uses the tenant-settings API parameters described here: https://github.com/SerenovaLLC/configurator/blob/master/src/configurator/api/tenants/tenant_settings.md
    
    * **tenantId** - (String) Id of the tenant to set the feature flag
    * **featureFlag** - (String) Name of the new feature flag
    * **value** - The value of the feature flag for this tenant
    * **description** - (String) Description/purpose of the feature flag