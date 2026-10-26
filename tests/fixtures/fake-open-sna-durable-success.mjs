#!/usr/bin/env node
// Synthetic contract fixture only. These values are not empirical test results.
import {readFileSync,writeFileSync} from 'node:fs';
const argument=name=>process.argv[process.argv.indexOf(name)+1];
const result=JSON.parse(readFileSync('public/open-sna/programming-resilience-demo.json','utf8'));
const selection=JSON.parse(readFileSync(argument('--selection'),'utf8'));
result.schemaVersion='1.2';result.dataSource='uploaded-workbook';result.source.selection=selection;
const strongest=new Map(result.subgroupComparison.strongestEdgeDifferences.map(edge=>[[edge.source,edge.target].sort().join('::'),edge]));
result.subgroupComparison.edgeDifferences=[];
for(let i=0;i<result.nodes.length;i++)for(let j=i+1;j<result.nodes.length;j++){
 const source=result.nodes[i].id,target=result.nodes[j].id;
 result.subgroupComparison.edgeDifferences.push(strongest.get([source,target].sort().join('::'))??{source,target,absoluteDifference:0,pValueHolm:1});
}
writeFileSync(argument('--output'),JSON.stringify(result));
