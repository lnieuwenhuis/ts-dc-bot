This project is a TypeScript rewrite of the original `lnieuwenhuis/safasbot`. The bot utilizes Discord.js for interacting with the Discord API and is containerized using Docker for easy deployment and management.

### Running the Bot with Docker

To run the bot using Docker, follow these steps:

1. **Clone the Repository:**

   First, clone the repository to your local machine:

   ```bash
   git clone https://github.com/lnieuwenhuis/ts-dc-bot.git
   cd ts-dc-bot
   ```

2. **Set Up Environment Variables:**

   Ensure you have a `.env` file in the root directory with the necessary environment variables. You can use the provided `.env.example` as a template:

   ```plaintext
   DISCORD_TOKEN=<YOUR TOKEN HERE>
   DISCORD_CLIENT_ID=<YOUR CLIENT ID HERE>
   WEATHER_API_KEY=<YOUR API KEY HERE>
   ```

3. **Build the Docker Image:**

   Build the Docker image using the provided `Dockerfile`:

   ```bash
   docker build -t ts-dc-bot .
   ```

4. **Run the Docker Container:**

   Use `docker-compose` to run the bot in a containerized environment:

   ```bash
   docker-compose up
   ```

   This will start the bot and expose it on port 3000 as specified in the `docker-compose.yml` file.

5. **Verify the Bot is Running:**

   Once the container is up, check the logs to ensure the bot has started successfully and is logged in to Discord.

   ```bash
   docker-compose logs -f
   ```

By following these steps, you can easily deploy and run the bot using Docker, making it simple to manage and scale as needed.

