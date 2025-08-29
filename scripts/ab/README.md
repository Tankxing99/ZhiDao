# A/B Hash Bucket Placeholder

This folder documents a simple consistent-hash bucketing strategy for server-side A/B.

- Mode: AB_MODE=hash
- UserId: openId or anonymousOpenid from dySDK.context
- Bucket: control (0) or treatment (1)

This is already integrated in /recommendPlants and returned in the `debug.ab` payload.


