# Security and threat model

## Assets and trust boundaries

The main assets are verified compatibility claims, reviewer attribution, compiled graph integrity, safe electrical guidance, and merchant redirect integrity. Untrusted inputs include catalog files, evidence notes, offers, shared rig fragments, and future widget host pages.

## Threats and controls

- **USB-C shape mistaken for electrical compatibility:** connector and direction, USB PD protocol/profile, voltage, current/power, cable limits, and scoped official evidence are separate mandatory facts. Shared connector geometry never supplies a missing fact.
- **Underspecified source or cable:** compare the device's exact required voltage, current, power, and PD profile against both the source advertisement and verified cable ratings. A documented mismatch or insufficient rating is incompatible; an absent rating or evidence is unknown, never compatible.
- **Misleading power runtime:** calculate only from complete positive sourced energy, efficiency, and typical-demand inputs. Never default Wh, efficiency, or load, and present runtime as a conditional estimate rather than a guarantee.
- **Power tether omitted from mechanical scope:** the demo source/cable are excluded from stabilized payload only because the exact fixture places them externally and requires disconnection during active gimbal use. They remain in carried weight and cost. A mounted source or connected tether invalidates that profile and must not inherit its compatibility result.
- **Diameter-only filter false positive:** a matching thread or clamp is insufficient. Device/sensor/lens scope, directional adapters, image circle, clear aperture, exact collision/vignetting declarations, and official mechanical/optical evidence are mandatory. Missing values are unknown; insufficient aperture or a measured collision is incompatible.
- **Optical accessory omitted from gimbal scope:** filters, rings, and matte boxes contribute payload and invalidate geometry profiles that do not name the same selections.
- **Candidate escalation:** schema-separated candidate records and publication validation requiring verified evidence.
- **Protocol confusion:** connector shape and signal protocol are distinct; conversions must be explicit and directional.
- **Audio power inferred through an adapter:** plug-in power, phantom power, USB bus power, and self-power are separate facts. An exact verified adapter must explicitly document required power pass-through; omission remains unknown.
- **Empty mount false positive:** blank or absent mount identifiers are missing data, never equal mechanical interfaces. Lens coverage additionally requires finite positive sensor and image-circle measurements.
- **Stored edge label bypasses runtime checks:** the public builder renders canonical evaluator output. Candidate or absent edges do not supply claim evidence, and a relation label cannot override incompatible or unknown dimensions.
- **Unsafe or damaging gimbal load:** rated payload, safety margin, exact selected-component mass, mounting, clearance, balance range, and scoped mechanical evidence are required; missing facts fail closed.
- **False-positive cage or accessory mounting:** require exact device IDs, non-overlapping evidence-scoped positive and negative body declarations, exact camera attachment and accessory-mount identifiers, explicit port and door clearance, and evidence for both the cage capabilities and selected-package requirements. Never infer fit or incompatibility from absence, body similarity, dimensions, photographs, connector shape, or screw appearance.
- **Stale bare-rig geometry after adding a cage:** gimbal profile lookup includes optional `cageId` and cannot fall back to an uncaged profile when a cage is selected.
- **Video plug treated as video-mode support:** exact connector direction, shared protocol profile, exact resolution/frame rate, destination capability, power precondition, and evidence are independently required.
- **Support overload or teleprompter collision:** exact rig product scope, measured payload, head weight, required margin, mount direction, plate, teleprompter limit, and width clearance are mandatory.
- **Lighting electric or mechanical false positive:** exact light allowlist, voltage, power, connector evidence, modifier mount/aperture, stand payload, and controller protocol are separate. A matching plug or voltage alone is never safe.
- **USB-C workflow bus confusion:** host direction, connector chain, exact bus, media format/protocol, sustained bottleneck, power, OS/software, and evidence are checked independently.
- **Podcast phantom/channel failure:** exact source count, signal protocol, interface inputs, phantom availability/channels/watts, host or external power, OS/app, and evidence are required. Candidate mobile paths remain unknown.
- **Data/code injection:** JSON parsing plus Zod validation; no `eval`, template execution, HTML injection, or executable imports.
- **Open redirect/affiliate abuse:** exact merchant/hostname pairs, HTTPS-only URLs, allowlisted product-path prefixes, and blocked redirect-style parameters; credentials, custom ports, fragments, host suffix tricks, merchant substitution, and arbitrary client redirect targets are rejected.
- **Tampered shared rig:** URL fragments are untrusted, size-limited, parsed and schema-validated; they cannot alter the catalog.
- **Supply-chain compromise:** lockfile, minimal dependencies, read-only CI permissions, dependency update review.
- **SEO poisoning:** only evidence-backed verified pages are indexable; candidate and thin pages receive `noindex`.
- **Cross-site widget abuse:** future widget uses a constrained message schema, origin allowlist, and no host DOM trust.
- **Unprotected demonstration deployment:** all public Vercel requests pass through Routing Middleware. The password exists only in the sensitive `SITE_PASSWORD` environment variable; the repository contains no credential. Missing configuration fails closed with HTTP 503. Successful authentication sets a derived-token cookie with `HttpOnly`, `Secure`, `SameSite=Lax`, a seven-day lifetime, and no raw password. The login response disables caching and indexing and applies a restrictive CSP, frame denial, MIME sniffing protection, and no-referrer policy. Automated tests cover missing configuration, rejection, unlock, and cookie admission.
- **Password guessing:** the access gate does not turn a weak shared password into strong identity. Rotate `SITE_PASSWORD` after the review window, use a longer random password for material confidentiality, and use platform identity protection if per-user access or revocation is required.

P0 incidents include any unsafe electrical recommendation. Stop publication, preserve the failing fixture, add a regression test, and review related paths.

For the USB-C PD slice, P0 regressions cover connector direction, missing PD support, exact profile mismatch, voltage mismatch, source or cable current/power shortfall, missing/incorrect evidence scope, and accidental reuse of the stationary-only profile while a gimbal tether remains connected. `unknown` must remain non-recommendable and cannot be converted to a positive result by UI copy, commercial ranking, or connector similarity.

A false-positive mechanical match that can drop, obstruct, or damage equipment is P1. Preserve the exact failing rig fixture. For gimbals, add regressions for payload, mounting, clearance, and balance; for cages, add regressions for enclosure fit, camera attachment, accessory mounting, port/door access, evidence gating, and caged-gimbal profile isolation before publication resumes.

A false-positive filter or matte-box match is P1 because it can damage threads, collide mechanically, or invalidate footage. Preserve the exact device/sensor/lens/accessory configuration and add regressions for direction, clear aperture, collision/vignetting, evidence, and gimbal-profile isolation.
