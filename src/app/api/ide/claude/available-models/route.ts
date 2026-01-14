import { NextRequest, NextResponse } from 'next/server';
import { getAllModels, getProviderById } from '@/db/queries';

type AvailableModel = {
  id: number;
  name: string;
  model_id: string;
  provider_id: number;
  provider_name: string;
  enabled: boolean;
};

type GroupedModels = {
  [providerName: string]: AvailableModel[];
};

/**
 * 查询可用模型列表（用于 IDE 配置）
 */
export async function GET(request: NextRequest) {
  try {
    // 获取所有已启用的模型
    const allModels = getAllModels().filter(m => m.enabled);

    if (allModels.length === 0) {
      return NextResponse.json({
        models: [],
        count: 0,
        message: 'No enabled models found. Please enable some models first.',
      });
    }

    // 按供应商分组
    const grouped = allModels.reduce((acc: GroupedModels, model) => {
      const provider = getProviderById(model.provider_id);
      if (provider) {
        if (!acc[provider.name]) {
          acc[provider.name] = [];
        }
        acc[provider.name].push({
          id: model.id,
          name: model.name,
          model_id: model.model_id,
          provider_id: model.provider_id,
          provider_name: provider.name,
          enabled: model.enabled,
        });
      }
      return acc;
    }, {} as GroupedModels);

    return NextResponse.json({
      models: grouped,
      count: allModels.length,
      providers: Object.keys(grouped),
    });
  } catch (error: any) {
    console.error('Available Models API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}
