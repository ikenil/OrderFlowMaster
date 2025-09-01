import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PlatformChartProps {
  data: { platform: string; percentage: number }[];
}

const COLORS = {
  'Amazon': 'hsl(25, 95%, 53%)',
  'Flipkart': 'hsl(213, 84%, 56%)',
  'Meesho': 'hsl(270, 84%, 60%)',
  'Website': 'hsl(142, 84%, 40%)',
};

export default function PlatformChart({ data }: PlatformChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
              dataKey="percentage"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[entry.platform as keyof typeof COLORS] || 'hsl(var(--primary))'}
                />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
