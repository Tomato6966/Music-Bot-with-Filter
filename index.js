const ytdl = require("discord-ytdl-core");
const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json")
const sytdl = require("ytdl-core")
const YouTubeAPI = require("simple-youtube-api");
const youtube = new YouTubeAPI(config.YOUTUBE_API_KEY);
const { connect } = require("http2");
const { createInterface } = require("readline");
client.queue = new Map();
const oldseek = new Map();
client.bass = 8;
client.loop = false;
client.login(config.token)


client.on("ready", () => {
    console.log("ready")
});



client.on("message",async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(config.prefix)) return;
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift();


    if (command === "play" || command === "p") {
        if (!message.member.voice.channel) return message.channel.send("You're not in a voice channel?");
        //define current queue
        const queue = message.client.queue.get(message.guild.id);

        //define Queue Construct
        const queueConstruct = {
            textChannel: message.channel,
            channel: message.member.voice.channel,
            connection: null,
            songs: [],
            loop: false,
            volume: 69,
            playing: true
        };
        //If not in the same channel return error
        if (queue && message.member.voice.channel !== message.guild.me.voice.channel) return message.reply("You arent in my Channel!")
        let songtoplay = args.join(" ");
        let song;
        if(!songtoplay.includes(["www","http","youtub"])){
            message.channel.send(new Discord.MessageEmbed().setColor("#c219d8")
              .setDescription(`**👍 Joined \`${message.member.voice.channel.name}\` 📄 bouned \`#${message.channel.name}\`**`)
              .setFooter(`By: ${message.author.username}#${message.author.discriminator}`))
         
            message.channel.send(new Discord.MessageEmbed().setColor("#c219d8")
              .setDescription(`**:white_check_mark: Searching 🔍 \`${args.join(" ")}\`**`))
            message.member.voice.channel.join().then(connection=>{
                  connection.voice.setDeaf(true);
                  connection.voice.setSelfDeaf(true);
              })
            song = await searchsong(songtoplay,message,client)
        }
        if(!song) return message.reply("Could not find this song!")

        console.log("A NEW SONG")

        queueConstruct.songs.push(song);

        
        if(queue)  {
            return message.channel.send(new Discord.MessageEmbed().setColor("#c219d8")
        .setDescription(`**:white_check_mark: [${song.title}](${song.url}) has been added to the Queue**`))}
        else{
            message.client.queue.set(message.guild.id, queueConstruct);
        }
       
        tryplaynext(queueConstruct.songs[0], message, client, client.bass, 0, queueConstruct);
     
        return;
    }
    if (command === "bass" || command === "b"){
        if (!message.member.voice.channel) return message.channel.send("You're not in a voice channel?");
        //define current queue
        const queue = message.client.queue.get(message.guild.id);
        //if nothing playing error
        if (!queue) return message.reply("There is nothing playing.").catch(console.error);
         //If not in the same channel return error
        if (queue && message.member.voice.channel !== message.guild.me.voice.channel) return message.reply("You arent in my Channel!")
        //if no args return
        if(!args[0]) return message.reply(`Bass at: \`${client.bass} dB\``);
        //if not a number return
        if(isNaN(args[0])) return message.reply("Please provide a Number");
        //if not valid number return
        if(args[0] > 25 || args[0] < -25) return message.reply("Not a Number between -25 and 25")
        //if not connected return
        //Define the current song
        const song = queue.songs[0];
        //get Queue Construct bzw. set it 
        const queueConstruct = {
            textChannel: queue.textChannel,
            channel: queue.channel,
            connection: queue.connection,
            songs: queue.songs,
            loop: queue.loop,
            volume: queue.volume,
            playing: queue.playing
        };
         //define current time
        let seek = (queue.connection.dispatcher.streamTime - queue.connection.dispatcher.pausedTime) / 1000;
        //Do soma mapping with old seek to provent a huge bug!
        let oldseekvar;
        try{
            oldseekvar = oldseek.get(`oldseek_${message.guild.id}`)
        } 
        catch{
            oldseekvar = 0;
        }
        //if its zero
        if(oldseekvar === 0 || !oldseekvar) seek=seek;
        //If not add the old seek to the new seek
        else seek = oldseekvar + seek;
        //Set the oldseek map with the new seek
        oldseek.set(`oldseek_${message.guild.id}`, seek)
        //send approve msg
        message.reply(`Bass set to: **${args[0]} dB**`)
        //play the msg with the new bass
        tryplaynext(song, message, client, args[0], seek, queueConstruct);
        return;
    }
    if (command === "skip" || command === "s"){
        if (!message.member.voice.channel) return message.channel.send("You're not in a voice channel?");
        //define current queue
        const queue = message.client.queue.get(message.guild.id);
        //if nothing playing error
        if (!queue) return message.reply("There is nothing playing.").catch(console.error);
         //If not in the same channel return error
        if (queue && message.member.voice.channel !== message.guild.me.voice.channel) return message.reply("You arent in my Channel!")
        //skip
        skip(queue,message,client)
        return;
    }
    if (command === "loop" || command === "l"){
        if (!message.member.voice.channel) return message.channel.send("You're not in a voice channel?");
        //define current queue
        const queue = message.client.queue.get(message.guild.id);
        //if nothing playing error
        if (!queue) return message.reply("There is nothing playing.").catch(console.error);
         //If not in the same channel return error
        if (queue && message.member.voice.channel !== message.guild.me.voice.channel) return message.reply("You arent in my Channel!")
        //change the loop type
        queue.loop = !queue.loop;
        //send approve message
        message.channel.send(`Loop is now **${queue.loop ? " enabled" : " disabled"}**`)    
        return;
    }
    if (command === "volume" || command === "vol"){
        if (!message.member.voice.channel) return message.channel.send("You're not in a voice channel?");
        //define current queue
        const queue = message.client.queue.get(message.guild.id);
        //if nothing playing error
        if (!queue) return message.reply("There is nothing playing.").catch(console.error);
         //If not in the same channel return error
        if (queue && message.member.voice.channel !== message.guild.me.voice.channel) return message.reply("You arent in my Channel!")
        //if no args return info embed   			 
        if (!args[0]) return message.channel.send(`🔊 Volume is: **${queue.volume}%**`).catch(console.error);
        //if args is not a number return error
        if (isNaN(args[0])) return message.reply("That's not a Number between **0 & 150**");
        //if args is not a Number between 150 and 0 return error
        if (parseInt(args[0]) < 0 || parseInt(args[0]) > 300)
        return message.reply("That's not a Number between **0 & 150**");
        //set queue volume to args
        queue.volume = args[0];
        //set current volume to the wanted volume
        queue.connection.dispatcher.setVolumeLogarithmic(args[0] / 100);
        //send approve message
        return queue.textChannel.send(`Volume changed to: **${args[0]}%**!`).catch(console.error);
        
    }
});
 
async function skip(queue,message,client,queueConstruct)
{
    if(!queue.songs || queue.songs === undefined || queue.songs.length === 0 || queue.songs.length === null)
    {
        message.reply("left the channel cause nothing left to play!")
        message.guild.me.voice.channel.leave();
        return client.queue.delete(message.guild.id)
    }
    if (queue.loop) {
        console.log("LOOP");
        let lastSong = queue.songs[0];
        queue.songs.push(lastSong);
        queue.songs.shift();
        tryplaynext(lastSong, message, client,client.bass,0, queueConstruct);

      } else {
        console.log("not loop");
        await queue.songs.shift();
        let lastSong = queue.songs[0];
        if(!queue.songs || queue.songs === undefined || queue.songs.length === 0 || queue.songs.length === null)
        {
            message.reply("left the channel cause nothing left to play!").then(message => message.delete({ timeout: 5000 }))
            message.guild.me.voice.channel.leave();
            return client.queue.delete(message.guild.id)
        }
        tryplaynext(lastSong, message, client,client.bass,0, queueConstruct);

      }
}

async function tryplaynext(song, message, client,bass, begintime, queueConstruct)
{  

    if(!begintime||begintime===0) begintime = 0;
    if(bass !== client.bass){
        client.bass = bass;
    }
    else{
        message.channel.send(new Discord.MessageEmbed().setColor("#c219d8")
        .setDescription(`**:white_check_mark: started playing: [${song.title}](${song.url})**`)
        .setFooter(`Effects: Bass(${client.bass} dB)`)
        )
    }
   

    let stream = ytdl(song.url, {
        filter: "audioonly",
        opusEncoded: true,
        encoderArgs: ['-af', `bass=g=${bass},dynaudnorm=f=100`],
        seek: begintime, //0.09 should start at 10 seconds but it does not
        liveBuffer: 40000,
        highWaterMark: 1024*1024*10,

    });

    const queue = message.client.queue.get(message.guild.id);
  
    queueConstruct.connection = await message.member.voice.channel.join();
    
    queueConstruct.connection.voice.setSelfDeaf(true);
    queueConstruct.connection.voice.setDeaf(true);

   
        const dispatcher =  queue.connection.play(stream, {
            type: "opus"
        })
        dispatcher.on("finish", async () => {
            skip(queue,message,client,queueConstruct)
        })
        dispatcher.setVolumeLogarithmic(queue.volume / 100);
       
        queue.connection.on("disconnect", () => message.client.queue.delete(message.guild.id));   
    
}

async function searchsong(songtosearch,message,client){
  
    let songInfo = null;
    let song = null;
      try {
        const results = await youtube.searchVideos(songtosearch, 1);
        songInfo = await sytdl.getInfo(results[0].url);
        song = {
          title: songInfo.videoDetails.title,
          url: songInfo.videoDetails.video_url,
          subs: songInfo.videoDetails.author.subscriber_count,
          thumbnail: "https://cdn.discordapp.com/attachments/748095614017077318/769672148524335114/unknown.png",
          duration: songInfo.videoDetails.lengthSeconds,
          author: songInfo.videoDetails.author.name,
          authorurl: songInfo.videoDetails.author.user_url,
        };
      } catch (error) {
        console.error(error);
        if (error.statusCode === 403) return console.log("Max. uses of api Key, please refresh!");
      }

    return song;
}
