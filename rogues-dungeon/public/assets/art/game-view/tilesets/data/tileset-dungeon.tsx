<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.11" tiledversion="1.12.2" name="tileset-dungeon" tilewidth="32" tileheight="32" tilecount="108" columns="12">
 <image source="../art/tileset-dungeon.png" width="384" height="288"/>
 <properties>
  <property name="dungeon:floor-tiles" value="13,25,26,28,37,38,39"/>
  <property name="dungeon:inward-corner-rules" value="{&quot;5&quot;:8,&quot;20&quot;:32,&quot;65&quot;:6,&quot;80&quot;:30}"/>
  <property name="dungeon:blocked-cell-rules" value="{&quot;1&quot;:49,&quot;2&quot;:48,&quot;4&quot;:12,&quot;5&quot;:12,&quot;8&quot;:0,&quot;15&quot;:8,&quot;16&quot;:1,&quot;17&quot;:1,&quot;20&quot;:1,&quot;32&quot;:5,&quot;60&quot;:53,&quot;62&quot;:53,&quot;64&quot;:17,&quot;65&quot;:17,&quot;68&quot;:17,&quot;80&quot;:1,&quot;112&quot;:5,&quot;128&quot;:53,&quot;135&quot;:8,&quot;143&quot;:8,&quot;195&quot;:6,&quot;225&quot;:6,&quot;226&quot;:59,&quot;227&quot;:6,&quot;230&quot;:21,&quot;232&quot;:34,&quot;236&quot;:21,&quot;238&quot;:21,&quot;248&quot;:48}"/>
  <property name="dungeon:wall-quarter-profiles" value="{&quot;nw&quot;:[19,49,17,6,53,49,17,6],&quot;ne&quot;:[19,49,12,8,48,49,12,8],&quot;sw&quot;:[19,1,17,30,5,1,17,30],&quot;se&quot;:[19,1,12,32,0,1,12,32]}"/>
 </properties>
 <tile id="43">
  <animation>
   <frame tileid="43" duration="400"/>
   <frame tileid="44" duration="400"/>
   <frame tileid="45" duration="400"/>
   <frame tileid="46" duration="400"/>
  </animation>
 </tile>
 <tile id="55">
  <animation>
   <frame tileid="55" duration="400"/>
   <frame tileid="56" duration="400"/>
   <frame tileid="57" duration="400"/>
   <frame tileid="58" duration="400"/>
  </animation>
 </tile>
 <tile id="67">
  <animation>
   <frame tileid="67" duration="400"/>
   <frame tileid="68" duration="400"/>
   <frame tileid="69" duration="400"/>
   <frame tileid="70" duration="400"/>
  </animation>
 </tile>
 <tile id="79">
  <animation>
   <frame tileid="79" duration="400"/>
   <frame tileid="80" duration="400"/>
   <frame tileid="81" duration="400"/>
   <frame tileid="82" duration="400"/>
  </animation>
 </tile>
 <tile id="91">
  <animation>
   <frame tileid="91" duration="400"/>
   <frame tileid="92" duration="400"/>
   <frame tileid="93" duration="400"/>
   <frame tileid="94" duration="400"/>
  </animation>
 </tile>
 <tile id="103">
  <animation>
   <frame tileid="103" duration="400"/>
   <frame tileid="104" duration="400"/>
   <frame tileid="105" duration="400"/>
   <frame tileid="106" duration="400"/>
  </animation>
 </tile>
 <wangsets>
  <wangset name="Room frame" type="mixed" tile="-1">
   <wangcolor name="Wall" color="#ff0000" tile="-1" probability="1"/>
   <wangtile tileid="0" wangid="0,0,1,1,1,0,0,0"/>
   <wangtile tileid="1" wangid="0,0,1,1,1,1,1,0"/>
   <wangtile tileid="5" wangid="0,0,0,0,1,1,1,0"/>
   <wangtile tileid="12" wangid="1,1,1,1,1,0,0,0"/>
   <wangtile tileid="13" wangid="1,1,1,1,1,1,1,1"/>
   <wangtile tileid="17" wangid="1,0,0,0,1,1,1,1"/>
   <wangtile tileid="48" wangid="1,1,1,0,0,0,0,0"/>
   <wangtile tileid="52" wangid="1,1,1,0,0,0,1,1"/>
   <wangtile tileid="53" wangid="1,0,0,0,0,0,1,1"/>
   <properties>
   <property name="tiled-ai:terrain-names" value="[&quot;Wall&quot;]"/>
   </properties>
  </wangset>
  <wangset name="Void frame" type="mixed" tile="-1">
   <wangcolor name="Wall" color="#ff0000" tile="-1" probability="1"/>
   <wangtile tileid="6" wangid="0,0,1,1,1,0,0,0"/>
   <wangtile tileid="7" wangid="0,0,1,1,1,1,1,0"/>
   <wangtile tileid="8" wangid="0,0,0,0,1,1,1,0"/>
   <wangtile tileid="18" wangid="1,1,1,1,1,0,0,0"/>
   <wangtile tileid="19" wangid="1,1,1,1,1,1,1,1"/>
   <wangtile tileid="20" wangid="1,0,0,0,1,1,1,1"/>
   <wangtile tileid="30" wangid="1,1,1,0,0,0,0,0"/>
   <wangtile tileid="31" wangid="1,1,1,0,0,0,1,1"/>
   <wangtile tileid="32" wangid="1,0,0,0,0,0,1,1"/>
  </wangset>
  <wangset name="Details" type="mixed" tile="-1">
   <wangcolor name="Details" color="#ff0000" tile="-1" probability="1"/>
   <wangtile tileid="9" wangid="0,0,0,0,1,0,0,0"/>
   <wangtile tileid="11" wangid="1,0,0,0,1,1,1,0"/>
   <wangtile tileid="21" wangid="1,0,0,0,1,0,0,0"/>
   <wangtile tileid="23" wangid="1,0,1,1,1,0,0,0"/>
   <wangtile tileid="33" wangid="1,0,0,0,0,0,0,0"/>
   <wangtile tileid="35" wangid="0,0,1,1,1,1,1,0"/>
  </wangset>
  <wangset name="Details alternate" type="mixed" tile="-1">
   <wangcolor name="Details" color="#ff0000" tile="-1" probability="1"/>
   <wangtile tileid="47" wangid="1,0,0,0,1,1,1,0"/>
   <wangtile tileid="59" wangid="1,0,1,1,1,0,0,0"/>
  </wangset>
 </wangsets>
</tileset>
