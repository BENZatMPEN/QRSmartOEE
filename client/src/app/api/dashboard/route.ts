import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // จำลองข้อมูลจากฐานข้อมูล
    const dashboardData = {
      totalUsers: Math.floor(Math.random() * 1000) + 500,
      activeConnections: Math.floor(Math.random() * 100) + 10,
      lastUpdate: new Date().toLocaleString('th-TH'),
      systemStatus: ['online', 'offline', 'warning'][Math.floor(Math.random() * 3)] as 'online' | 'offline' | 'warning'
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
} 