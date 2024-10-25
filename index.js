const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const ffmpeg = require('ffmpeg-static');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates] });

const player = createAudioPlayer();

// The ID of the channel where users can create tickets
const TICKET_CHANNEL_ID = 'YOUR_TICKET_CHANNEL_ID'; // Replace with your ticket channel ID

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Listen for messages to create tickets
client.on('messageCreate', async (message) => {
    // Ticket creation button
    if (message.channel.id === TICKET_CHANNEL_ID && !message.author.bot) {
        const embed = new EmbedBuilder()
            .setColor('BLUE')
            .setTitle('Create a Ticket')
            .setDescription('Click the button below to create a support ticket.');

        const button = new ButtonBuilder()
            .setCustomId('create_ticket')
            .setLabel('Create Ticket')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        await message.channel.send({ embeds: [embed], components: [row] });
    }

    // Create a ticket when button is clicked
    if (message.customId === 'create_ticket') {
        const ticketChannel = await message.guild.channels.create(`ticket-${message.author.username}`, {
            type: 'GUILD_TEXT',
            permissionOverwrites: [
                {
                    id: message.guild.id,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: message.author.id,
                    allow: ['VIEW_CHANNEL'],
                },
            ],
        });

        ticketChannel.send(`Hello ${message.author}, your ticket has been created!`);
    }
});

// Say command
client.on('messageCreate', message => {
    if (message.content.startsWith('-say') && message.member.permissions.has('ADMINISTRATOR')) {
        const args = message.content.split(' ').slice(1);
        const sayMessage = args.join(' ');
        message.channel.send(sayMessage);
    }

    // Ping command
    if (message.content === '-ping') {
        message.reply('Pong! Latency is ' + Math.round(client.ws.ping) + 'ms');
    }
});

// Music system
client.on('messageCreate', async message => {
    if (message.content.startsWith('-play')) {
        const args = message.content.split(' ').slice(1);
        const url = args[0];

        if (!url) return message.channel.send('Please provide a YouTube URL.');

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.channel.send('You need to be in a voice channel to play music!');

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
        });

        const resource = createAudioResource(ytdl(url, { filter: 'audioonly', quality: 'highest', highWaterMark: 1 << 25, ffmpegPath: ffmpeg }));
        player.play(resource);
        connection.subscribe(player);

        player.on(AudioPlayerStatus.Playing, () => {
            message.channel.send(`Now playing: ${url}`);
        });

        player.on(AudioPlayerStatus.Idle, () => {
            connection.destroy();
        });

        // Handle errors
        player.on('error', (error) => {
            const errorEmbed = new EmbedBuilder()
                .setColor('RED')
                .setTitle('Error')
                .setDescription(`An error occurred: ${error.message}`);
            message.channel.send({ embeds: [errorEmbed] });
        });
    }

    if (message.content === '-pause') {
        player.pause();
        message.channel.send('Paused the music. 🎵');
    }

    if (message.content === '-resume') {
        player.unpause();
        message.channel.send('Resumed the music. 🎵');
    }

    if (message.content.startsWith('-volume')) {
        const args = message.content.split(' ').slice(1);
        const volume = parseInt(args[0]);

        if (volume < 0 || volume > 100) return message.channel.send('Volume must be between 0 and 100.');

        player.setVolume(volume / 100);
        message.channel.send(`Volume set to ${volume}%. 🔊`);
    }
});

client.login(process.env.DISCORD_TOKEN);
