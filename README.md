# Netlify-minutes

Command-line tool to help pinpoint which of your builds are consuming too many minutes.

## Installation

```shell
yarn add --global netlify-minutes
```

## Usage

You need a `NETLIFY_AUTH_TOKEN`, which you can create on the [Netlify dashboard][1].

```shell
NETLIFY_AUTH_TOKEN="XXXXX" netlify-minutes 2020-05-04
```

It will display a list of all your website that build this day, with their
deploys and the time each took. Results are ordered with the site and deploys
that consumed the most time first.

![example output][2]

## Options

You can pass `--cachePath=./any/path` to the command to store the API results on
disk. This will make any subsequent call to `netlify-minutes` much faster as it
will read from the disk cache instead of requesting the API.

[1]: https://app.netlify.com/user/applications#personal-access-tokens
[2]: https://raw.githubusercontent.com/pixelastic/netlify-minutes/master/.github/output.png
