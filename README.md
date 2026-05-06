<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
<p align="center">
<img width="60" height="68" alt="EverShop Logo" src="https://raw.githubusercontent.com/evershopcommerce/evershop/dev/.github/images/logo-green.png"/>
</p>
<p align="center">
  <h1 align="center">NBCShop</h1>
</p>
<p align="center">
  <a href="https://trendshift.io/repositories/212" target="_blank"><img src="https://trendshift.io/api/badge/repositories/212" alt="evershopcommerce%2Fevershop | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>
</p>
<h4 align="center">
    <a href="https://evershop.io/docs/development/getting-started/introduction">Documentation</a> |
    <a href="https://demo.evershop.io/">Demo</a>
</h4>

<p align="center">
  <img src="https://github.com/evershopcommerce/evershop/actions/workflows/build_test.yml/badge.svg" alt="Github Action"> <a href="https://twitter.com/evershopjs"><img alt="Twitter Follow" src="https://img.shields.io/twitter/follow/evershopjs?style=social"></a> <a href="https://discord.gg/GSzt7dt7RM"><img src="https://img.shields.io/discord/757179260417867879?label=discord" alt="Discord"></a> <a href="https://opensource.org/licenses/GPL-3.0"><img src="https://img.shields.io/badge/License-GPLv3-blue.svg" alt="License"></a>
</p>

<p align="center">
<img alt="EverShop" width="950" src="https://raw.githubusercontent.com/evershopcommerce/evershop/dev/.github/images/banner.png"/>
</p>

## Introduction

EverShop is a modern, TypeScript-first eCommerce platform built with GraphQL and React. Designed for developers, it offers essential commerce features in a modular, fully customizable architecture—perfect for building tailored shopping experiences with confidence and speed.

## Installation Using Docker


You can get started with EverShop in minutes by using the Docker image. The Docker image is a great way to get started with EverShop without having to worry about installing dependencies or configuring your environment.

```bash
curl -sSL https://raw.githubusercontent.com/evershopcommerce/evershop/main/docker-compose.yml > docker-compose.yml
docker compose up -d
```

For the full installation guide, please refer to our [Installation guide](https://evershop.io/docs/development/getting-started/installation-guide).

## Local development (from source)

Run the monorepo on your machine when you are working on this repository (not the published Docker image).

### Prerequisites

- **Node.js** (LTS or current; this repo uses `type: "module"`)
- **PostgreSQL 13+** listening on a host/port your app can reach
- **npm** (this repo ships a root `package-lock.json`; use `npm ci` for a clean install)

### 1. Install dependencies

From the repository root:

```bash
npm ci
```

### 2. Compile package output (`dist`)

The root `dev` / `start` / `build` scripts run compiled files under `packages/evershop/dist`. On a fresh clone you need to compile first:

```bash
npm run compile
npm run compile:db
```

`compile:db` builds `@evershop/postgres-query-builder` into `packages/postgres-query-builder/dist` (required at runtime).

### 3. Build storefront and admin assets

```bash
npm run build
```

If `npm run build-fast` fails with `evershop: command not found`, the workspace `bin` link may be missing until a reinstall; you can invoke the CLI directly:

```bash
node ./packages/evershop/dist/bin/evershop.js build -- --skip-minify
```

### 4. Database and `.env`

Create a database (example name: `evershop`) and a database user with access to it.

Create a **`.env` file in the repository root** (do not commit real credentials). EverShop reads database settings from the environment:

```env
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="evershop"
DB_USER="postgres"
DB_PASSWORD="your_password"
DB_SSLMODE="disable"
```

**Alternative — interactive install:** `npm run setup` walks you through database questions and writes `.env` for you. Skip this if you already manage `.env` yourself.

**Runtime folders:** ensure these exist (the install command also creates them):

```bash
mkdir -p media public
```

### 5. Optional demo data

```bash
node ./packages/evershop/dist/bin/evershop.js seed --all
```

### 6. Start the server

```bash
npm run start
```

By default the app listens on **`http://localhost:3000`** (override with `PORT` if needed).

**Useful URLs**

| What | URL |
|------|-----|
| Storefront | `http://localhost:3000/` |
| Admin (redirects to login) | `http://localhost:3000/admin` → `http://localhost:3000/admin/login` |
| Storefront GraphQL (POST) | `http://localhost:3000/api/graphql` |
| Admin GraphQL (POST, auth required) | `http://localhost:3000/api/admin/graphql` |
| CMS page by `url_key` | `http://localhost:3000/page/<url_key>` (e.g. `/page/about-us` after seeding) |

**Admin user:** after a manual `.env` setup, create the first admin with:

```bash
node ./packages/evershop/dist/bin/evershop.js user:create --name "Admin" --email "you@example.com" --password "yourSecurePassword"
```

(Password must be at least 8 characters.) Or use `npm run setup`, which can create an admin during installation.

**Note:** you may see `node-config` warnings about `config/` or `NODE_ENV`; the app can still run. To silence “no configuration directory” warnings you can set `SUPPRESS_NO_CONFIG_WARNING=1` in the environment.

### 中文速览（本地源码）

- **依赖**：Node.js + PostgreSQL 13+；在仓库根目录执行 `npm ci`。
- **编译**：必须先 `npm run compile` 与 `npm run compile:db`，再 `npm run build`（若报找不到 `evershop`，改用 `node ./packages/evershop/dist/bin/evershop.js build -- --skip-minify`）。
- **数据库**：创建库与用户；在根目录放置 **`.env`**（含 `DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、`DB_PASSWORD`、`DB_SSLMODE`）；也可用 **`npm run setup`** 交互生成 `.env`。建议执行 `mkdir -p media public`。
- **演示数据（可选）**：`node ./packages/evershop/dist/bin/evershop.js seed --all`
- **启动**：`npm run start`，默认 **`http://localhost:3000`**
- **后台**：`http://localhost:3000/admin/login`；若手动配好 `.env` 后还没有管理员，用上面的 **`user:create`**（密码至少 8 位），或在 **`npm run setup`** 里创建。
- **GraphQL**：前台 **`POST http://localhost:3000/api/graphql`**；后台 **`POST /api/admin/graphql`**（需登录）。
- **CMS 静态页**：路径为 **`/page/<url_key>`**（例如种子数据里的 `/page/about-us`），不是根路径下的 `/<url_key>`。

## Documentation

- [Installation guide](https://evershop.io/docs/development/getting-started/installation-guide).

- [Extension development](https://evershop.io/docs/development/module/create-your-first-extension).

- [Theme development](https://evershop.io/docs/development/theme/theme-overview).


## Demo

Explore our demo store.

<p align="left">
  <a href="https://demo.evershop.io/admin" target="_blank">
    <img alt="evershop-backend-demo" height="35" alt="EverShop Admin Demo" src="https://raw.githubusercontent.com/evershopcommerce/evershop/dev/.github/images/evershop-demo-back.png"/>
  </a>
  <a href="https://demo.evershop.io/" target="_blank">
    <img alt="evershop-store-demo" height="35" alt="EverShop Store Demo" src="https://raw.githubusercontent.com/evershopcommerce/evershop/dev/.github/images/evershop-demo-front.png"/>
  </a>
</p>
<b>Demo user:</b>

Email: demo@evershop.io<br/>
Password: 123456

## Support

If you like my work, feel free to:

- ⭐ this repository. It helps.
- [![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)][tweet] about EverShop. Thank you!

[tweet]: https://twitter.com/intent/tweet?url=https%3A%2F%2Fgithub.com%2Fevershopcommerce%2Fevershop&text=Awesome%20React%20Ecommerce%20Project&hashtags=react,ecommerce,expressjs,graphql

## Contributing

EverShop is an open-source project. We are committed to a fully transparent development process and appreciate highly any contributions. Whether you are helping us fix bugs, proposing new features, improving our documentation or spreading the word - we would love to have you as part of the EverShop community.

### Ask a question about EverShop

You can ask questions, and participate in discussions about EverShop-related topics in the EverShop Discord channel.

<a href="https://discord.gg/GSzt7dt7RM"><img src="https://raw.githubusercontent.com/evershopcommerce/evershop/dev/.github/images/discord_banner_github.svg" /></a>

### Create a bug report

If you see an error message or run into an issue, please [create bug report](https://github.com/evershopcommerce/evershop/issues/new). This effort is valued and it will help all EverShop users.


### Submit a feature request

If you have an idea, or you're missing a capability that would make development easier and more robust, please [Submit feature request](https://github.com/evershopcommerce/evershop/issues/new).

If a similar feature request already exists, don't forget to leave a "+1".
If you add some more information such as your thoughts and vision about the feature, your comments will be embraced warmly :)


Please refer to our [Contribution Guidelines](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md).

## 🚀 The Future of EverShop

EverShop is seeing rapid organic growth and strong adoption from the developer community. We are now scaling our operations and building **EverShop Cloud**.

If you are a strategic investor interested in the future of Node.js commerce and our mission to set a new standard for modern eCommerce, we’d love to share our vision and roadmap with you.

📩 **Get in touch:** support@evershop.io

## License

[GPL-3.0 License](https://github.com/evershopcommerce/evershop/blob/main/LICENSE)
