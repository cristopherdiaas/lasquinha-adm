const express = require('express');
const axios = require('axios');
const router = express.Router();

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;

const API_ENDPOINT = 'https://discord.com/api';

router.get('/discord', (req, res) => {
  const scope = 'identify guilds';
  const redirect = `${API_ENDPOINT}/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}`;
  res.redirect(redirect);
});

router.get('/discord/callback', async (req, res) => {
  const code = req.query.code;

  try {
    const tokenRes = await axios.post(`${API_ENDPOINT}/oauth2/token`,
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        scope: 'identify guilds'
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const access_token = tokenRes.data.access_token;

    const userRes = await axios.get(`${API_ENDPOINT}/users/@me`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const guildsRes = await axios.get(`${API_ENDPOINT}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const user = userRes.data;
    const guilds = guildsRes.data;

    const isAdmin = guilds.some(guild => guild.id === process.env.DISCORD_BOT_GUILD_ID && (guild.permissions & 0x8)); // Admin permission

    if (!isAdmin) {
      return res.status(403).json({ message: 'Acesso negado: não é administrador do servidor.' });
    }

    res.cookie('discord_user', user, { httpOnly: false });
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error('Erro no login:', error.response?.data || error.message);
    res.status(500).send('Erro ao autenticar com o Discord.');
  }
});

module.exports = router;
