import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'synthetic_cloud_edge_offloading_dataset.csv');
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'Dataset is empty' }, { status: 400 });
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const totalRows = lines.length - 1;
    const numColumns = headers.length;

    // We will parse the entire dataset to calculate aggregates, 
    // but only return the first 100 rows for preview to save bandwidth.
    
    let localCount = 0;
    let edgeCount = 0;
    let cloudCount = 0;
    
    let taskTypes: Record<string, number> = {};
    
    let minReward = Infinity;
    let maxReward = -Infinity;
    let sumReward = 0;

    const optActionIndex = headers.indexOf('optimal_action');
    const optRewardIndex = headers.indexOf('optimal_reward');
    const taskTypeIndex = headers.indexOf('task_type');

    const previewData = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== numColumns) continue;

      const action = values[optActionIndex];
      if (action === 'LOCAL') localCount++;
      else if (action === 'EDGE') edgeCount++;
      else if (action === 'CLOUD') cloudCount++;

      const type = values[taskTypeIndex];
      taskTypes[type] = (taskTypes[type] || 0) + 1;

      const reward = parseFloat(values[optRewardIndex]);
      if (!isNaN(reward)) {
        if (reward < minReward) minReward = reward;
        if (reward > maxReward) maxReward = reward;
        sumReward += reward;
      }

      if (previewData.length < 100) {
        const rowObj: Record<string, any> = {};
        headers.forEach((header, idx) => {
          rowObj[header] = values[idx];
        });
        previewData.push(rowObj);
      }
    }

    const avgReward = sumReward / totalRows;

    return NextResponse.json({
      meta: {
        totalSamples: totalRows,
        numFeatures: numColumns,
        headers,
      },
      distribution: {
        optimalAction: {
          LOCAL: localCount,
          EDGE: edgeCount,
          CLOUD: cloudCount
        },
        taskType: taskTypes
      },
      rewards: {
        min: minReward,
        max: maxReward,
        avg: avgReward
      },
      preview: previewData
    });

  } catch (error) {
    console.error('Error reading dataset:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
