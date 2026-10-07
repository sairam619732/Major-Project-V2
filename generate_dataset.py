import csv
import random
import os
import math

output_file = "public/data/synthetic_cloud_edge_offloading_dataset.csv"

# Ensure directory exists
os.makedirs(os.path.dirname(output_file), exist_ok=True)

columns = [
    "sample_id", "task_type", "data_size_mb", "cpu_demand_percent", "memory_demand_percent",
    "deadline_ms", "priority", "local_cpu_available_percent", "local_memory_available_percent",
    "local_battery_percent", "local_base_latency_ms", "edge_cpu_load_percent", "edge_task_queue",
    "edge_network_latency_ms", "edge_bandwidth_gbps", "cloud_cpu_load_percent", "cloud_task_queue",
    "cloud_network_latency_ms", "cloud_bandwidth_gbps", "local_latency_ms", "edge_latency_ms",
    "cloud_latency_ms", "local_energy_units", "edge_energy_units", "cloud_energy_units",
    "local_cost_units", "edge_cost_units", "cloud_cost_units", "optimal_action", "optimal_action_index",
    "optimal_reward"
]

task_types = ["IMAGE", "VIDEO", "SENSOR"]
actions = ["LOCAL", "EDGE", "CLOUD"]

print("Generating 20,000 rows of synthetic dataset...")
with open(output_file, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(columns)
    
    for i in range(1, 20001):
        task_type = random.choice(task_types)
        data_size_mb = round(random.uniform(1.0, 50.0), 2)
        cpu_demand = round(random.uniform(10.0, 90.0), 1)
        mem_demand = round(random.uniform(5.0, 80.0), 1)
        deadline_ms = round(random.uniform(50, 1000), 1)
        priority = random.randint(1, 5)
        
        l_cpu = round(random.uniform(10.0, 90.0), 1)
        l_mem = round(random.uniform(10.0, 90.0), 1)
        l_batt = round(random.uniform(5.0, 100.0), 1)
        l_lat = round(random.uniform(10, 200), 1)
        
        e_cpu = round(random.uniform(10.0, 95.0), 1)
        e_q = random.randint(0, 50)
        e_net = round(random.uniform(5.0, 50.0), 1)
        e_bw = round(random.uniform(0.1, 2.0), 2)
        
        c_cpu = round(random.uniform(5.0, 80.0), 1)
        c_q = random.randint(0, 100)
        c_net = round(random.uniform(30.0, 150.0), 1)
        c_bw = round(random.uniform(1.0, 10.0), 2)
        
        local_lat = l_lat
        edge_lat = e_net + random.uniform(10, 50)
        cloud_lat = c_net + random.uniform(50, 200)
        
        l_energy = round(random.uniform(1.0, 10.0), 2)
        e_energy = round(random.uniform(0.1, 2.0), 2)
        c_energy = round(random.uniform(0.1, 1.0), 2)
        
        l_cost = round(random.uniform(0, 0), 2)
        e_cost = round(random.uniform(0.01, 0.1), 3)
        c_cost = round(random.uniform(0.05, 0.5), 3)
        
        opt_idx = random.randint(0, 2)
        opt_action = actions[opt_idx]
        opt_rew = round(random.uniform(0.1, 0.99), 4)
        
        writer.writerow([
            i, task_type, data_size_mb, cpu_demand, mem_demand, deadline_ms, priority,
            l_cpu, l_mem, l_batt, l_lat, e_cpu, e_q, e_net, e_bw, c_cpu, c_q, c_net, c_bw,
            round(local_lat, 2), round(edge_lat, 2), round(cloud_lat, 2),
            l_energy, e_energy, c_energy, l_cost, e_cost, c_cost,
            opt_action, opt_idx, opt_rew
        ])
print("Done!")
