const Discord = require('discord.js');
const Keyv = require('keyv');
const bns = new Keyv(process.env.bns);
const logChannels = new Keyv(process.env.logChannels);
const bannedUsers = new Keyv(process.env.bannedUsers);
const { deletionTimeout, reactionError, reactionSuccess, pinEmojiId } = require('../../config.json');

module.exports = {
  name: 'ban',
  description: `Restricts a user's access to the server.`,
  usage: 'ban @`user` `(days)` `(reason)`',
  requiredPerms: 'BAN_MEMBERS',
  permError: 'It appears that you lack permissions to ban.',
  async execute(message, args, prefix) {
    const member = message.mentions.members.first();
    const user = message.mentions.users.first();
    const author = message.author.username;
    const days = args[1];
    if (!message.guild.me.hasPermission('BAN_MEMBERS')) {
      let msg = await message.channel.send('I require the `Ban Members` permission in order to perform this action.');
      msg.delete({ timeout: deletionTimeout });
      return message.react(reactionError);
    }

    if (!member) {
      let msg = await message.channel.send(`Couldn't find ${args[0]}`);
      msg.delete({ timeout: deletionTimeout });
      return message.react(reactionError);
    }

    if (user.id == message.author.id) {
      let msg = await message.channel.send(`You can't ban youself, smarty pants!`);
      msg.delete({ timeout: deletionTimeout });
      return message.react(reactionError);
    }

    let modHighestRole = -1;
    let memberHighestRole = -1;
    message.member.roles.cache.forEach((r) => {
      if (r.position > modHighestRole) modHighestRole = r.position;
    });
    member.roles.cache.forEach((r) => {
      if (r.position > memberHighestRole) memberHighestRole = r.position;
    });
    if (modHighestRole <= memberHighestRole) {
      let msg = await message.channel.send('Your roles must be higher than the roles of the person you want to ban!');
      msg.delete({ timeout: deletionTimeout });
      return message.react(reactionError);
    }

    if (!message.guild.member(member).bannable) {
      let msg = await message.channel.send(`Make sure that my role is higher than the roles of the person you want to ban!`);
      msg.delete({ timeout: deletionTimeout });
      return message.react(reactionError);
    }

    if (isNaN(days) || !days) {
      if (!member) {
        let msg = await message.channel.send(`Proper command usage: ${prefix}ban @[user] (days) (reason)`);
        msg.delete({ timeout: deletionTimeout });
        return message.react(reactionError);
      }

      if (days <= 0) {
        let msg = await message.channel.send('Days must be a positive number.');
        msg.delete({ timeout: deletionTimeout });
        return message.react(reactionError);
      }

      args.shift();
      let BanInfo = {};
      BanInfo.userID = member.user.id;
      BanInfo.username = member.user.username;
      let bannedUsersArr = await bannedUsers.get(message.guild.id);
      if (!bannedUsersArr) bannedUsersArr = [];
      bannedUsersArr.push(BanInfo);
      await bannedUsers.set(message.guild.id, bannedUsersArr);
      let bans = await bns.get(`bans_${member.id}_${message.guild.id}`);
      if (!bans) bans = 1;
      else bans = bans + 1;

      const banEmbed = new Discord.MessageEmbed()
        .setColor('#00ffbb')
        .setTitle(`${message.client.emojis.cache.get(pinEmojiId).toString()} Ban Information`)
        .addFields(
          { name: `Defendant's name:`, value: `${member.user.tag}` },
          { name: `Issued by:`, value: `${author}` },
          { name: `Duration:`, value: `Permanent` }
        )
        .setFooter(`You can use ${prefix}unban ${member.user.username} to unban ${member.user.username} earlier.`)
        .setTimestamp();
      let msg = `${author} has permanently banned you from ${message.guild.name}.`;
      if (args.length > 0) {
        const reason = '`' + args.join(' ') + '`';
        banEmbed.addField('Reason', reason);
        msg += ` Reason: ${reason}.`;
      }
      const logChName = await logChannels.get(`logchannel_${message.guild.id}`);
      const log = message.guild.channels.cache.find((ch) => ch.name === `${logChName}`);
      if (!log) await message.channel.send(banEmbed);
      else await log.send(banEmbed);
      await member.send(msg);
      await bns.set(`bans_${member.id}_${message.guild.id}`, bans);
      await message.guild.member(member).ban();
      message.react(reactionSuccess);
    }

    if (!isNaN(days)) {
      if (!member) {
        let msg = await message.channel.send(`Proper command usage: ${prefix}ban @[user] (days) (reason)`);
        msg.delete({ timeout: deletionTimeout });
        return message.react(reactionError);
      }

      args.shift();
      args.shift();
      let bans = await bns.get(`bans_${member.id}_${message.guild.id}`);
      if (!bans) bans = 1;
      else bans = bans + 1;

      const banEmbed = new Discord.MessageEmbed()
        .setColor('#00ffbb')
        .setTitle(`${message.client.emojis.cache.get(pinEmojiId).toString()} Ban Information`)
        .addFields(
          { name: `Defendant's name:`, value: `${member}` },
          { name: `Issued by:`, value: `${author}` },
          { name: `Duration:`, value: `${days} days` }
        )
        .setFooter(`You can use ${prefix}unban ${member.user.username} to unban ${member.user.username} earlier than ${days} days.`)
        .setTimestamp();
      let msg = `${author} has permanently banned you from ${message.guild.name}. Duration: ${days} days.`;
      let BanInfo = {};
      BanInfo.userID = member.user.id;
      BanInfo.username = member.user.username;
      BanInfo.unbanDate = Date.now() + days * 86400000;
      let bannedUsersArr = await bannedUsers.get(message.guild.id);
      if (!bannedUsersArr) bannedUsersArr = [];
      bannedUsersArr.push(BanInfo);
      await bannedUsers.set(message.guild.id, bannedUsersArr);
      if (args.length > 0) {
        const reason = '`' + args.join(' ') + '`';
        banEmbed.addField('Reason', reason);
        msg += ` Reason: ${reason}`;
      }
      const logChName = await logChannels.get(`logchannel_${message.guild.id}`);
      const log = message.guild.channels.cache.find((ch) => ch.name === `${logChName}`);
      if (!log) await message.channel.send(banEmbed);
      else await log.send(banEmbed);
      await member.send(msg);
      await bns.set(`bans_${member.id}_${message.guild.id}`, bans);
      await message.guild.member(member).ban();
      message.react(reactionSuccess);
    }
  }
}