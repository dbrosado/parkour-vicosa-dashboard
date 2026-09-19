import test from 'node:test'
import assert from 'node:assert/strict'
import {mergeChanges, SyncConflict} from '../src/lib/sync-merge.ts'
test('preserves independent edits to same entity and inbound arrival', () => {
  const base = {students:[{id:'a', name:'A', payment:0}], messages:[]}
  const local = {students:[{id:'a', name:'B', payment:0}], messages:[]}
  const remote = {students:[{id:'a', name:'A', payment:50}], messages:[{id:'m',content:'oi'}]}
  assert.deepEqual(mergeChanges(base,local,remote), {students:[{id:'a',name:'B',payment:50}],messages:remote.messages})
})
test('deletion remains deleted; concurrent additions survive', () => {
 const base=[{id:'a',n:1},{id:'b',n:2}]
 assert.deepEqual(mergeChanges(base,[base[1]],[...base,{id:'c',n:3}]),[base[1],{id:'c',n:3}])
})
test('conflicting changes and delete versus edit require decision',()=>{
 assert.throws(()=>mergeChanges([{id:'a',n:1}],[{id:'a',n:2}],[{id:'a',n:3}]),SyncConflict)
 assert.throws(()=>mergeChanges([{id:'a',n:1}],[],[{id:'a',n:3}]),SyncConflict)
})
test('edits during save and separate attendance are preserved',()=>{
 assert.deepEqual(mergeChanges({name:'submitted'},{name:'typed later'},{name:'submitted'}),{name:'typed later'})
 assert.deepEqual(mergeChanges({}, {day:{a:'present'}},{day:{b:'absent'}}),{day:{a:'present',b:'absent'}})
})
test('simultaneous receipts cannot merge to an incorrect financial total',()=>{
 const invoice={id:'pay',amount:200,amountPaid:0,receipts:[]}
 const base={students:[{id:'a',paymentHistory:[invoice]}]}
 const received=id=>({students:[{id:'a',paymentHistory:[{...invoice,amountPaid:50,receipts:[{id,amount:50}]}]}]})
 assert.throws(()=>mergeChanges(base,received('r1'),received('r2')),SyncConflict)
})
test('message arrival and lead edits preserve latest metadata',()=>{
 const base={id:'lead',name:'A',updatedAt:'2026-01-01T10:00:00Z',history:[]}
 const local={...base,name:'B',updatedAt:'2026-01-01T10:00:01Z'}
 const remote={...base,updatedAt:'2026-01-01T10:00:02Z',history:[{id:'msg'}]}
 assert.deepEqual(mergeChanges(base,local,remote),{...remote,name:'B'})
})
