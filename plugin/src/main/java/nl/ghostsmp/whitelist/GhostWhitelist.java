package nl.ghostsmp.whitelist;

import com.google.gson.*;
import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.plugin.java.JavaPlugin;
import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

public final class GhostWhitelist extends JavaPlugin {
  private File file;
  private YamlConfiguration data;
  private final Object lock = new Object();
  private final AtomicBoolean syncing = new AtomicBoolean(false);
  private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
  private String base(){return getConfig().getString("api.base-url", "").replaceAll("/+$", "");}
  private String token(){return getConfig().getString("api.token", "");}
  @Override public void onEnable(){
    saveDefaultConfig(); file=new File(getDataFolder(),"applications.yml");data=YamlConfiguration.loadConfiguration(file);
    long seconds=Math.max(15,getConfig().getLong("api.poll-seconds",30));
    Bukkit.getScheduler().runTaskTimerAsynchronously(this,this::sync,40,seconds*20);
    getLogger().info("Externe whitelist synchronisatie ingeschakeld. Oude lokale aanvragen blijven bewaard.");
  }
  private HttpRequest.Builder request(String path){
    return HttpRequest.newBuilder(URI.create(base()+path)).timeout(Duration.ofSeconds(15)).header("Authorization","Bearer "+token());
  }
  private void sync(){
    if(!syncing.compareAndSet(false,true))return;
    try{
      if(!base().startsWith("https://")||token().startsWith("VUL_HIER"))return;
      HttpResponse<String> response=http.send(request("/api/plugin/applications").GET().build(),HttpResponse.BodyHandlers.ofString());
      if(response.statusCode()!=200){getLogger().warning("Synchronisatie HTTP "+response.statusCode());return;}
      JsonArray arr=JsonParser.parseString(response.body()).getAsJsonObject().getAsJsonArray("applications");
      int added=0;
      synchronized(lock){
        for(JsonElement element:arr){JsonObject a=element.getAsJsonObject();String id=a.get("id").getAsString();if(!id.matches("[a-f0-9]{8}"))continue;
          if(!data.contains(id+".minecraft"))added++;
          for(String key:new String[]{"minecraft","discord","reason","status","created","reviewer","reviewed"}){
            if(a.has(key)&&!a.get(key).isJsonNull())data.set(id+"."+key,a.get(key).getAsString());
          }
        }
        if(added>0 || arr.size()>0)data.save(file);
      }
      if(added>0) getLogger().info(added+" nieuwe aanvraag/aanvragen gesynchroniseerd.");
    }catch(Exception ex){getLogger().warning("Sync mislukt: "+ex.getMessage());}
    finally{syncing.set(false);}
  }
  @Override public boolean onCommand(CommandSender sender,Command cmd,String label,String[] args){
    if(!sender.hasPermission("ghostwhitelist.staff")){sender.sendMessage("§cGeen toestemming.");return true;}
    if(args.length==0){sender.sendMessage("§b/gw list | /gw approve <id> | /gw deny <id> | /gw sync | /gw reload");return true;}
    if(args[0].equalsIgnoreCase("reload")){reloadConfig();sender.sendMessage("§aConfig herladen.");return true;}
    if(args[0].equalsIgnoreCase("sync")){Bukkit.getScheduler().runTaskAsynchronously(this,this::sync);sender.sendMessage("§aSynchronisatie gestart.");return true;}
    if(args[0].equalsIgnoreCase("list")){
      synchronized(lock){int n=0;for(String id:data.getKeys(false))if("pending".equals(data.getString(id+".status"))){sender.sendMessage("§b"+id+" §f"+data.getString(id+".minecraft")+" §7Discord: "+data.getString(id+".discord")+" §7Motivatie: "+data.getString(id+".reason"));n++;}if(n==0)sender.sendMessage("§7Geen openstaande aanvragen.");}return true;
    }
    if(args.length<2||!(args[0].equalsIgnoreCase("approve")||args[0].equalsIgnoreCase("deny"))){sender.sendMessage("§cOnbekend commando.");return true;}
    String id=args[1].toLowerCase(Locale.ROOT);boolean approve=args[0].equalsIgnoreCase("approve");
    if(!id.matches("[a-f0-9]{8}")){sender.sendMessage("§cOngeldig ID.");return true;}
    synchronized(lock){if(!"pending".equals(data.getString(id+".status"))){sender.sendMessage("§cAanvraag niet openstaand. Probeer /gw sync.");return true;}}
    String reviewer=sender.getName();sender.sendMessage("§eAanvraag wordt verwerkt...");
    Bukkit.getScheduler().runTaskAsynchronously(this,()->{
      try{
        JsonObject payload=new JsonObject();payload.addProperty("status",approve?"approved":"denied");payload.addProperty("reviewer",reviewer);
        HttpResponse<String> response=http.send(request("/api/plugin/review/"+id).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(payload.toString(),StandardCharsets.UTF_8)).build(),HttpResponse.BodyHandlers.ofString());
        if(response.statusCode()!=200){Bukkit.getScheduler().runTask(this,()->sender.sendMessage("§cServer weigerde beoordeling (HTTP "+response.statusCode()+"). /gw sync"));return;}
        Bukkit.getScheduler().runTask(this,()->{
          synchronized(lock){String name=data.getString(id+".minecraft","");
            if(approve){OfflinePlayer player=Bukkit.getOfflinePlayer(name);player.setWhitelisted(true);}
            data.set(id+".status",approve?"approved":"denied");data.set(id+".reviewer",reviewer);data.set(id+".reviewed",java.time.Instant.now().toString());
            try{data.save(file);}catch(IOException ex){getLogger().severe("Opslaan mislukt: "+ex.getMessage());}
            sender.sendMessage((approve?"§aGoedgekeurd en gewhitelist: ":"§eAfgewezen: ")+name);
          }
        });
      }catch(Exception ex){Bukkit.getScheduler().runTask(this,()->sender.sendMessage("§cAPI niet bereikbaar: "+ex.getMessage()));}
    });return true;
  }
}
