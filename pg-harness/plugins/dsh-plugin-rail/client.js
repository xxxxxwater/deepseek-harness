/** Persistent capability rail using the installed inventory and existing DSH navigation services. */
window.__ModuleLoader__.load({ id: 'dsh-plugin-rail', factory: () => ({
 name: 'plugin-rail-client', inject: ['layout', 'slots', 'remote', 'remote.pluginManager', 'uiWorkspace'],
 apply(ctx) {
  const icons = {
   more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
   pin:'<path d="m9 3 6 0-1 5 4 4v2H6v-2l4-4ZM12 14v8"/>',
   panel:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>',
   chat:'<path d="M21 11a8 8 0 0 1-8 8H7l-4 3V11a9 9 0 0 1 18 0Z"/>',
   plus:'<path d="M12 5v14M5 12h14"/>',
   clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
   puzzle:'<path d="M4 4h5a3 3 0 1 1 6 0h5v5a3 3 0 1 0 0 6v5h-5a3 3 0 1 0-6 0H4v-5a3 3 0 1 1 0-6Z"/>',
   office:'<path d="M6 3h9l4 4v14H6Z M14 3v5h5M9 12h7M9 16h7"/>',
   at:'<circle cx="12" cy="12" r="4"/><path d="M16 8v7c0 3 5 2 5-3a9 9 0 1 0-4 8"/>',
   editor:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18M13 9l-2 3 2 3M16 9l2 3-2 3"/>',
   book:'<path d="M3 5c4-2 6-1 9 1 3-2 5-3 9-1v14c-4-2-6-1-9 1-3-2-5-3-9-1ZM12 6v14"/>',
   reverse:'<path d="m7 3-4 4 4 4M3 7h10a7 7 0 0 1 0 14h-3"/>',
   brain:'<path d="M12 5c-2-4-7-2-7 1-4 1-3 5-2 6-3 4 0 8 4 7 2 4 5 2 5 0M12 5c2-4 7-2 7 1 4 1 3 5 2 6 3 4 0 8-4 7-2 4-5 2-5 0ZM12 5v14M6 9l3 2M18 9l-3 2"/>',
   context:'<rect x="4" y="3" width="16" height="5" rx="2"/><rect x="4" y="10" width="16" height="5" rx="2"/><path d="M4 18h16M7 21h10"/>',
   globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
   link:'<path d="m10 14 4-4M8 16l-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 0) scale(.9)"/>',
   store:'<path d="M4 8h16l-1 13H5ZM8 8V6a4 4 0 0 1 8 0v2"/>',
   waves:'<path d="M3 6c3-4 5 4 9 0s6 4 9 0M3 12c3-4 5 4 9 0s6 4 9 0M3 18c3-4 5 4 9 0s6 4 9 0"/>',
   design:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 6 1 3 3 1-3 1-1 3-1-3-3-1 3-1ZM13 17l4-4 2 2-4 4h-2Z"/>',
   code:'<path d="m7 6-5 6 5 6M17 6l5 6-5 6M14 4l-4 16"/>',
   palette:'<path d="M21 12a9 9 0 1 0-9 9c4 0 1-4 3-5 1-1 6 1 6-4Z"/><circle cx="7" cy="10" r=".6"/><circle cx="11" cy="6" r=".6"/><circle cx="16" cy="8" r=".6"/>',
   team:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5"/>',
   mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
   shield:'<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6ZM8 12l3 3 5-6"/>',
   inspect:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6M7 10h6M10 7v6"/>',
   branch:'<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 7v10M18 7c0 6-12 3-12 8"/>',
   terminal:'<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m6 8 4 4-4 4M13 16h5"/>',
   translate:'<path d="M3 5h12M9 2v3M5 5c1 6 4 8 8 10M13 5c-1 5-4 8-10 11M14 21l4-10 4 10M16 17h4"/>',
   search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
   title:'<path d="M3 5h18M12 5v15M8 20h8M3 5v3M21 5v3"/>',
   badge:'<path d="m12 2 3 5 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1Z"/>',
   repeat:'<path d="M4 10a8 8 0 0 1 14-5l3 3M21 3v5h-5M20 14A8 8 0 0 1 6 19l-3-3M3 21v-5h5"/>',
   agent:'<rect x="4" y="6" width="16" height="15" rx="4"/><path d="M12 2v4M1 11v5M23 11v5M8 11h1M15 11h1M8 16h8"/>',
   infinity:'<path d="M12 12c-6-10-15 0-9 5 4 3 7-3 9-5 6-10 15 0 9 5-4 3-7-3-9-5Z"/>'
  };
  const map = {
   'dsh-univer-office':['office','文档与表格'], 'dsh-at-file':['at','文件提及'],
   'dsh-better-sidebar':['editor','文件树与编辑器'], '@linxin666/dsh-client-ui-skill-explorer':['book','技能中心','技能中心'],
   '@dhicoc/dsh-reverse-skill':['reverse','反向技能'], '@vectorize-io/hindsight-coding-agents':['brain','长期记忆'],
   'billion-context':['infinity','长上下文'], 'dsh-context':['context','上下文洞察','上下文洞察'],
   'dsh-ego-browser':['globe','浏览器自动化'], 'dsh-sentinelx':['link','SentinelX 连接'],
   'dshmarket':['store','插件市场'], 'open-sea-skin':['waves','海洋皮肤'], 'dsh-magicpath':['design','MagicPath 设计'],
   'dsh-pixel-font':['title','像素字体'], 'dsh-vscode-code-theme':['code','代码配色'], 'dsh-imessage-blue':['palette','聊天配色'],
   '@deepseek-ai/dsh-experimental-agent-team-profile':['team','智能体团队'],
   '@deepseek-ai/dsh-experimental-auto-review':['shield','自动授权审查'],
   '@deepseek-ai/dsh-experimental-inspector-profile':['inspect','开发者工具'],
   '@deepseek-ai/dsh-experimental-voice-input-bundle':['mic','语音输入'],
   '@deepseek-ai/dsh-experimental-tool-worktree':['branch','Git 工作树'],
   '@deepseek-ai/dsh-experimental-cot-translation-bundle':['translate','思考过程翻译'],
   '@deepseek-ai/dsh-experimental-terminal-bundle':['terminal','实验性终端'],
   '@deepseek-ai/dsh-experimental-session-search':['search','会话搜索'],
   '@deepseek-ai/dsh-experimental-session-titles-bundle':['title','会话标题'],
   '@deepseek-ai/dsh-experimental-badge-skill-bundle':['badge','技能徽章'],
   '@deepseek-ai/dsh-experimental-ralph-bundle':['repeat','Ralph 工作流'],
   '@deepseek-ai/dsh-subagent-codex':['code','Codex 子智能体'],
   '@deepseek-ai/dsh-subagent-claude-code':['agent','Claude Code 子智能体']
  };
  ctx.effect(() => {
   let disposed=false, generation=0, selectedPlugin=null, hoverTimer, inventory=[];
   const pinKey='dsh-plugin-rail:pinned:v1';
   let pins;
   try{pins=new Set(JSON.parse(localStorage.getItem(pinKey)||'null')||['dsh-context','@linxin666/dsh-client-ui-skill-explorer','dshmarket','dsh-univer-office']);}catch{pins=new Set();}
   const svg=icon=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[icon]+'</svg>';
   const style=document.createElement('style'); style.id='dsh-plugin-rail-style';
   style.textContent=`body #root{margin-left:56px;width:calc(100% - 56px)}
    #dsh-plugin-rail{position:fixed;inset:48px auto 0 0;width:56px;box-sizing:border-box;z-index:120;background:var(--dsw-specific-sidebar-fill);border-right:1px solid var(--dsw-alias-border-l3);display:flex;flex-direction:column;align-items:center;padding:8px 4px 10px;gap:5px;-webkit-app-region:no-drag}
    #dsh-plugin-rail button{width:38px;height:38px;flex-shrink:0;display:grid;place-items:center;padding:0;border:0;border-radius:11px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background .15s,color .15s;-webkit-app-region:no-drag}
    #dsh-plugin-rail button:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
    #dsh-plugin-rail button[aria-current=page]{background:color-mix(in srgb,#0a64d8 15%,transparent);color:#2485ed}
    #dsh-plugin-rail button:focus-visible{outline:2px solid #2485ed;outline-offset:1px}
    #dsh-plugin-rail button[data-disabled=true]{opacity:.45}
    #dsh-plugin-rail svg{width:20px;height:20px;pointer-events:none}
    #dsh-plugin-rail .rail-plugins{width:100%;min-height:0;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;align-items:center;gap:4px;scrollbar-width:thin;flex:1;padding:5px 0}
    #dsh-plugin-rail .rail-divider{height:1px;width:26px;flex-shrink:0;background:var(--dsw-alias-border-l3);margin:3px 0}
    #dsh-plugin-rail .rail-status{position:absolute;left:64px;bottom:16px;max-width:280px;padding:10px 14px;border-radius:10px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);box-shadow:0 2px 16px #0003;font-size:12px}
    #dsh-plugin-rail .rail-status:empty{display:none}
    #dsh-plugin-rail-tooltip{position:fixed;z-index:10000;max-width:min(350px,calc(100vw - 80px));padding:10px 13px;border:1px solid var(--dsw-alias-border-l3);border-radius:12px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);box-shadow:0 6px 24px #0003;pointer-events:none;font-size:13px;line-height:1.5}
    #dsh-plugin-rail-tooltip[hidden]{display:none}
    #dsh-plugin-rail button[data-pinned=true]::after{content:'';position:absolute;width:4px;height:4px;border-radius:50%;background:#2485ed;right:5px;top:5px}
    #dsh-plugin-rail button{position:relative}
    #dsh-plugin-rail-menu{position:fixed;left:64px;bottom:16px;z-index:9999;width:min(360px,calc(100vw - 80px));max-height:calc(100vh - 96px);overflow:auto;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l3);border-radius:14px;padding:8px;box-shadow:0 8px 32px #0004;font-size:13px}
    #dsh-plugin-rail-menu[hidden]{display:none}
    #dsh-plugin-rail-menu header{padding:8px 10px;font-weight:600}
    #dsh-plugin-rail-menu .plugin-row{display:flex;align-items:center;gap:4px;border-radius:8px}
    #dsh-plugin-rail-menu .plugin-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
    #dsh-plugin-rail-menu button{border:0;background:transparent;color:inherit;cursor:pointer;border-radius:8px;padding:8px;display:flex;align-items:center;gap:10px;text-align:left}
    #dsh-plugin-rail-menu button:focus-visible{outline:2px solid #2485ed}
    #dsh-plugin-rail-menu .plugin-open{flex:1;min-width:0}
    #dsh-plugin-rail-menu svg{width:18px;height:18px;flex-shrink:0}
    #dsh-plugin-rail-menu small{display:block;color:var(--dsw-alias-label-secondary);font-size:10px;overflow-wrap:anywhere}
    #dsh-plugin-rail-menu button[aria-pressed=true]{color:#2485ed;background:color-mix(in srgb,#0a64d8 12%,transparent)}
    #dsh-plugin-rail-tooltip strong{display:block;font-size:13px;font-weight:600}
    #dsh-plugin-rail-tooltip small{display:block;margin-top:3px;font-size:11px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}`;
   document.head.append(style);
   const nav=document.createElement('nav'); nav.id='dsh-plugin-rail';nav.setAttribute('aria-label','插件能力导航');
   const status=document.createElement('div');status.className='rail-status';status.setAttribute('role','status');
   const report=message=>{status.textContent=message;};
   const tooltip=document.createElement('div');tooltip.id='dsh-plugin-rail-tooltip';tooltip.setAttribute('role','tooltip');tooltip.hidden=true;
   const tipTitle=document.createElement('strong'),tipDetail=document.createElement('small');tooltip.append(tipTitle,tipDetail);document.body.append(tooltip);
   const hideTip=()=>{clearTimeout(hoverTimer);tooltip.hidden=true;for(const button of nav.querySelectorAll('[aria-describedby]'))button.removeAttribute('aria-describedby');};
   const showTip=button=>{hideTip();hoverTimer=setTimeout(()=>{
    if(disposed)return;tipTitle.textContent=button.dataset.tooltipTitle||button.getAttribute('aria-label');tipDetail.textContent=button.dataset.tooltipDetail||'';tipDetail.hidden=!tipDetail.textContent;
    tooltip.hidden=false;const rect=button.getBoundingClientRect();tooltip.style.left='64px';tooltip.style.top=Math.max(8,Math.min(rect.top,window.innerHeight-tooltip.offsetHeight-8))+'px';button.setAttribute('aria-describedby',tooltip.id);
   },180);};
   const make=(id,icon,label,action)=>{
    const button=document.createElement('button');button.type='button';button.dataset.railId=id;button.dataset.tooltipTitle=label;button.setAttribute('aria-label',label);
    button.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[icon]||icons.puzzle)+'</svg>';
    button.addEventListener('mouseenter',()=>showTip(button));button.addEventListener('mouseleave',hideTip);button.addEventListener('focus',()=>showTip(button));button.addEventListener('blur',hideTip);
    button.addEventListener('click',()=>{hideTip();report('');Promise.resolve().then(action).catch(()=>report('暂时无法打开此入口，请在插件页查看。'));});return button;
   };
   const toggle=make('sidebar-toggle','panel','展开或收起侧边栏',()=>ctx.layout.toggleSidebar());nav.append(toggle);
   nav.append(make('new-session','plus','新会话',()=>ctx.get('uiWorkspace').startSession()));
   const conversation=make('conversation','chat','返回对话',()=>{selectedPlugin=null;ctx.layout.selectPanel(null);});nav.append(conversation);
   const divider=document.createElement('div');divider.className='rail-divider';nav.append(divider);
   const list=document.createElement('div');list.className='rail-plugins';nav.append(list);
   const menu=document.createElement('div');menu.id='dsh-plugin-rail-menu';menu.hidden=true;menu.setAttribute('aria-label','插件预览与置顶');document.body.append(menu);
   const more=make('more','more','更多插件 · 预览与置顶',()=>{hideTip();menu.hidden=!menu.hidden;more.setAttribute('aria-expanded',String(!menu.hidden));if(!menu.hidden)renderMenu();});more.setAttribute('aria-expanded','false');more.setAttribute('aria-controls',menu.id);nav.append(more);
   const closeMenu=()=>{menu.hidden=true;more.setAttribute('aria-expanded','false');};
   const sortRail=()=>{for(const b of [...list.children].sort((a,b)=>Number(pins.has(b.dataset.plugin))-Number(pins.has(a.dataset.plugin)))){b.dataset.pinned=String(pins.has(b.dataset.plugin));list.append(b);}};
   const togglePin=name=>{if(pins.has(name))pins.delete(name);else pins.add(name);try{localStorage.setItem(pinKey,JSON.stringify([...pins]));}catch{report('置顶已生效，但此设备暂时无法保存设置。');}sortRail();renderMenu();};
   const renderMenu=()=>{
    menu.replaceChildren();const header=document.createElement('header');header.textContent='插件预览 · '+pins.size+' 个置顶';menu.append(header);
    const ordered=[...inventory].sort((a,b)=>Number(pins.has(b.name))-Number(pins.has(a.name)));
    for(const bundle of ordered){const [icon,label]=map[bundle.name]||['puzzle',bundle.name];const row=document.createElement('div');row.className='plugin-row';
     const open=document.createElement('button');open.type='button';open.className='plugin-open';open.innerHTML=svg(icon);const text=document.createElement('span'),name=document.createElement('span'),detail=document.createElement('small');name.textContent=label;detail.textContent=bundle.name+(bundle.version?' · v'+bundle.version:'')+(bundle.enabled?'':' · 未启用');text.append(name,detail);open.append(text);open.setAttribute('aria-label','打开 '+label);open.addEventListener('click',()=>{closeMenu();[...list.children].find(b=>b.dataset.plugin===bundle.name)?.click();});
     const pin=document.createElement('button');pin.type='button';pin.innerHTML=svg('pin');pin.title=pin.getAttribute('aria-label')||'';pin.setAttribute('aria-label',(pins.has(bundle.name)?'取消置顶 ':'置顶 ')+label);pin.title=pin.getAttribute('aria-label');pin.setAttribute('aria-pressed',String(pins.has(bundle.name)));pin.addEventListener('click',()=>togglePin(bundle.name));row.append(open,pin);menu.append(row);
    }
   };
   const outside=e=>{if(!menu.contains(e.target)&&!more.contains(e.target))closeMenu();};const escape=e=>{if(e.key==='Escape')closeMenu();};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
   const all=make('plugins','puzzle','全部插件',()=>{selectedPlugin=null;ctx.layout.selectPanel('plugins');sync();});nav.append(all);
   nav.append(status);document.body.append(nav);
   const sync=()=>{
    const active=ctx.layout.panelInfo.getSnapshot().activePanelId;
    conversation.toggleAttribute('aria-current',active===null); if(active===null)conversation.setAttribute('aria-current','page');
    all.toggleAttribute('aria-current',active==='plugins'&&!selectedPlugin);if(active==='plugins'&&!selectedPlugin)all.setAttribute('aria-current','page');
    for(const b of list.querySelectorAll('button')){const current=b.dataset.panel===active||active==='plugins'&&b.dataset.plugin===selectedPlugin;b.toggleAttribute('aria-current',current);if(current)b.setAttribute('aria-current','page');}
    const closed=document.querySelector('[data-sidebar-collapsed]')?.getAttribute('data-sidebar-collapsed')==='true';
    toggle.setAttribute('aria-expanded',String(!closed));toggle.dataset.tooltipTitle=closed?'展开侧边栏':'收起侧边栏';toggle.setAttribute('aria-label',toggle.dataset.tooltipTitle);
   };
   const refresh=async()=>{
    const request=++generation;
    const result=await ctx.remote.pluginManager.listBundles();
    if(disposed||request!==generation)return;
    if(!result.ok){report('插件清单暂时无法读取。');return;}
    const entries=result.value.filter(b=>b.name!=='dsh-plugin-rail'&&(b.installed||b.optional&&b.enabled));
    hideTip();inventory=entries;list.replaceChildren();
    const panels=ctx.slots.entriesOfSlot('sidebar.panellist');
    for(const bundle of entries){
     const [icon,label,panelLabel]=map[bundle.name]||['puzzle',bundle.meta?.name?.zh||bundle.name];
     const panel=panelLabel&&panels.find(e=>{const label=e.options.label;return (typeof label==='function'?label():label)===panelLabel;});
     const button=make(bundle.name,icon,label,async()=>{
      selectedPlugin=bundle.name;
      if(panel){ctx.layout.selectPanel(panel.options.id);return;}
      ctx.layout.selectPanel('plugins');
      const navigation=ctx.get('pluginNavigation');
      if(navigation){navigation.openBundle(bundle.name);sync();return;}
      report('已打开插件页，请选择 '+label+'。');
     });
     button.dataset.tooltipDetail=bundle.name+(bundle.version?' · v'+bundle.version:'')+(bundle.enabled?'':' · 未启用');
     button.addEventListener('contextmenu',e=>{e.preventDefault();hideTip();menu.hidden=false;more.setAttribute('aria-expanded','true');renderMenu();const row=[...menu.querySelectorAll('.plugin-row')].find(r=>r.querySelector('.plugin-open').getAttribute('aria-label')==='打开 '+label);row?.scrollIntoView({block:'nearest'});});
     button.dataset.plugin=bundle.name;button.dataset.disabled=String(!bundle.enabled);
     if(panel)button.dataset.panel=panel.options.id;
     list.append(button);
    }
    nav.dataset.pluginCount=String(entries.length);sortRail();if(!menu.hidden)renderMenu();sync();
   };
   list.addEventListener('scroll',hideTip);window.addEventListener('resize',hideTip);
   const observer=new MutationObserver(sync);observer.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['data-sidebar-collapsed']});
   const offPanel=ctx.layout.panelInfo.subscribe(sync);
   const offInventory=ctx.remote.$on('plugin-manager/changed',()=>{void refresh().catch(()=>report('插件清单暂时无法刷新。'));});
   sync();void refresh().catch(()=>report('插件清单暂时无法读取。'));
   return()=>{disposed=true;generation++;observer.disconnect();offPanel();offInventory();hideTip();window.removeEventListener('resize',hideTip);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);menu.remove();tooltip.remove();nav.remove();style.remove();};
  }, 'plugin-rail: persistent capability navigation');
 }
}) });
