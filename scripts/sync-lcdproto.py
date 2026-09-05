import subprocess,pathlib,re,json,hashlib
root=pathlib.Path(__file__).resolve().parents[1]
repo=root.parent/'LCDPROTO'; sha='95dafb92b5ba87683294698bb7ea89729fd148d4'
queue=['components/states/EnvironmentLayer.tsx','lib/environmentConfig.ts','components/experimental/cloud-blob/cloudRenderer.ts','components/experimental/cloud-blob/cloudLobeSystem.ts','lib/expressions/coreExpressions.ts','lib/expressions/types.ts','lib/performances/corePerformances.ts','lib/performances/performanceRunner.ts','lib/stateEmotionMap.ts','lib/cloudPresets.ts','lib/deviceStates.ts']
seen={}
while queue:
 p=queue.pop()
 if p in seen: continue
 raw=subprocess.check_output(['git','-C',str(repo),'show',sha+':'+p]); seen[p]=hashlib.sha256(raw).hexdigest()
 dest=root/'vendor/lcdproto'/p;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(raw)
 for imp in re.findall(r'from\s+[\"\']([^\"\']+)',raw.decode()):
  if imp.startswith('@/'): q=imp[2:]
  elif imp.startswith('.'): q=str(pathlib.PurePosixPath(p).parent/imp)
  else: continue
  import posixpath
  q=posixpath.normpath(q)
  if not q.endswith(('.ts','.tsx')): q+='.ts'
  if subprocess.run(['git','-C',str(repo),'cat-file','-e',sha+':'+q],stderr=subprocess.DEVNULL).returncode: q=q[:-3]+'/index.ts'
  queue.append(q)
(root/'vendor/lcdproto/manifest.json').write_text(json.dumps({'repository':'Maxkhrys/LCDPROTO','branch':'feat/cloud-menu-ui-accents','sha':sha,'files':seen},indent=2)+'\n')
print('Vendored',len(seen),'unchanged source files')
