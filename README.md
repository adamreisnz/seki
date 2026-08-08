# Seki – An Embeddable Go Player

### Usage instructions
See [sekiplayer.com](https://sekiplayer.com/)

### About
Seki is a powerful embeddable Go/Baduk/Weiqi player for the modern age. It's Simple, Elegant, Compact and Intuitive.

It provides functionality for reading, parsing, displaying, editing and replaying Go/Baduk/Weiqi game records.

It is a continuation of the defunct [ngGo](https://github.com/adamreisnz/ngGo) project, but has undergone a full rewrite to decouple it from Angular and update it to a modern modular code base using the latest Javascript features.

ngGo was originally based on the excellent work of Jan Prokop, who created the original javascript library [WGo.js](http://wgo.waltheri.net/). ngGo was based on WGo version 1.2.5, which was the latest version at the time of conversion.

All code has been refactored for the modern web. The code has also been improved to provide more flexibility and run more efficiently. All files have been tidied up in general, linted and extensively commented to provide for easy to read source code with a consistent formatting. Lastly, all the source code files have been organized in a logical manner and split up into sensible classes, making it easy to find all the different modules and functionality of this library.

### Development
Run `pnpm run check` to lint the source and run the test suite.

### Releasing
Releases are published to npm by the `Release` workflow, which runs on any tag matching `v*`. To cut one, from an up to date `main`:

```sh
pnpm version patch
```

Use `minor` or `major` as appropriate. That runs the checks, bumps the version, creates the tag, and pushes both the commit and the tag, which is what starts the workflow. Publishing goes through npm trusted publishing, so there is no token to store or rotate, and the release carries a provenance attestation.
