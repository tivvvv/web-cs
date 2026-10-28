// 分区程序环境声. 只在用户激活音频后建节点, 随唯一主循环更新, 暂停/静音立即释放播放连接.
FPS.models.coastalSoundscape = (T,o={}) => {
  const root=new T.Group(),zones=o.zones??[],voices=[],chirps=new Set();let active,buffer,elapsed=0,nextBird=8,disposed=false;
  function stop(){for(const v of voices){v.source.stop();v.source.disconnect();v.filter.disconnect();v.gain.disconnect();v.pan?.disconnect();}voices.length=0;for(const c of chirps){c.source.stop();c.source.disconnect();c.gain.disconnect();c.pan?.disconnect();}chirps.clear();active=null;}
  function start(api,sound){
    const ctx=sound.context;if(!buffer){buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*3),ctx.sampleRate);const data=buffer.getChannelData(0);let seed=503,previous=0;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;previous=previous*.86+(seed/4294967296-.5)*.14;data[i]=previous;}}
    for(const zone of zones.slice(0,4)){
      const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),pan=ctx.createStereoPanner?.();source.buffer=buffer;source.loop=true;
      filter.type=zone.kind==='harbor'?'bandpass':'lowpass';filter.frequency.value=zone.kind==='trees'?1400:zone.kind==='harbor'?130:550;filter.Q.value=.6;gain.gain.value=0;
      source.connect(filter).connect(gain);if(pan)gain.connect(pan).connect(sound.output);else gain.connect(sound.output);source.start(0,(zone.phase??0)%3);voices.push({source,filter,gain,pan,zone});
    }active={api,context:ctx};
  }
  return {root,update(dt,api){
    if(disposed)return;const sound=api.audio?.();if(!sound){if(active)stop();return;}if(active?.context!==sound.context){if(active)stop();start(api,sound);}
    elapsed+=dt;let birdWeight=0;
    for(const v of voices){const {zone}=v,dx=sound.position.x-zone.position[0],dz=sound.position.z-zone.position[1],d=Math.hypot(dx,dz),t=Math.max(0,1-d/zone.radius),weight=t*t*(3-2*t);
      const swell=.83+.17*Math.sin(elapsed*(zone.kind==='sea'?.37:.19)+(zone.phase??0));v.gain.gain.setTargetAtTime(weight*(zone.volume??.15)*swell,sound.context.currentTime,.2);if(v.pan)v.pan.pan.setTargetAtTime(Math.max(-.6,Math.min(.6,(-dx*(sound.right?.[0]??1)-dz*(sound.right?.[1]??0))/zone.radius)),sound.context.currentTime,.2);
      if(zone.kind==='trees')birdWeight=Math.max(birdWeight,weight);
    }
    if(elapsed>nextBird){nextBird=elapsed+9+Math.sin(elapsed*.7)*3;if(birdWeight>.2&&chirps.size<3){const ctx=sound.context;
      for(let i=0;i<2;i++){const source=ctx.createOscillator(),gain=ctx.createGain(),pan=ctx.createStereoPanner?.(),t=ctx.currentTime+i*.13;source.type='sine';source.frequency.setValueAtTime(2300+i*350,t);source.frequency.exponentialRampToValueAtTime(3300-i*200,t+.07);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.009*birdWeight,t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+.1);source.connect(gain);if(pan){pan.pan.value=Math.sin(elapsed)*.65;gain.connect(pan).connect(sound.output);}else gain.connect(sound.output);const voice={source,gain,pan};chirps.add(voice);source.onended=()=>{source.disconnect();gain.disconnect();pan?.disconnect();chirps.delete(voice);};source.start(t);source.stop(t+.11);}
    }}
  },beforeRender(){if(active&&!active.api.audio?.())stop();},dispose(){if(disposed)return;disposed=true;stop();buffer=null;}};
};
