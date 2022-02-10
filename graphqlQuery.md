Multiple query with aliases
`{
  shop {
    settings:metafield(namespace: "swpf", key: "settings") {
      value
    }
    something_admin:metafield(namespace: "swpf", key: "something_admin") {
      value
    }
  }
}`


mutation
mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      key
      value
    }
    userErrors {
      field
      message
    }
  }
}

variables

{
  "metafields": [
    {
    "key": "settings",
    "namespace": "swpf",
    "ownerId": "gid://shopify/Metafield/21001966125221",
    "type": "json",
    "value": "{\"hostedOnWP\":true,\"postNumber\":3}"
    }
  ]
}