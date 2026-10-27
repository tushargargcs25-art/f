# FoodLoop databases

FoodLoop uses both databases:

- **MySQL** stores users and requirements, including requirement categories as JSON.
- **MongoDB** stores donations and reviews.

## Run locally

1. Start a MySQL server and a MongoDB server.
2. Copy `.env.example` to `.env.local` and set the MySQL credentials. The MySQL user needs permission to create the configured database and tables. MongoDB creates the configured database and collections when the API connects.
3. Install dependencies with `pnpm install`.
4. Start the API with `pnpm api`.
5. In another terminal, start the web app with `pnpm dev`.

The API defaults to `http://localhost:4000`. The Next.js app proxies `/api/*` requests to it; set `FOODLOOP_API_URL` if the API runs at another address. On first startup, the API inserts the sample users and requirements into MySQL and sample donations and reviews into MongoDB. Existing records are preserved on later starts; the seed is only inserted into an empty MongoDB collection. Donor listings are saved to MongoDB and loaded back into the dashboard after refresh.

The supported settings are `PORT`, `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `MONGODB_URI`, and `MONGODB_DATABASE`.
