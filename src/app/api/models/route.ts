import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db/database';
import {
  getAllModels,
  createModel,
  updateModel,
  deleteModel,
  getModelsByProvider,
  getProviderById,
} from '@/db/queries';
import { getProviderAdapter } from '@/server/providers';

// Ensure Node.js runtime (required for SQLite)
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    getDatabase();
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('provider_id');

    if (providerId) {
      const models = getModelsByProvider(parseInt(providerId));
      return NextResponse.json(models);
    } else {
      const models = getAllModels();
      return NextResponse.json(models);
    }
  } catch (error: any) {
    console.error('Models API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    getDatabase();
    const body = await request.json();
    const { provider_id, name, model_id, enabled } = body;

    if (!provider_id || !name || !model_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const model = createModel({
      provider_id,
      name,
      model_id,
      enabled: enabled !== undefined ? enabled : true,
    });

    return NextResponse.json(model);
  } catch (error: any) {
    console.error('Models API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    getDatabase();
    const body = await request.json();
    const { id, name, model_id, enabled, provider_id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (model_id !== undefined) updateData.model_id = model_id;
    if (enabled !== undefined) updateData.enabled = enabled;
    if (provider_id !== undefined) updateData.provider_id = provider_id;

    const model = updateModel(id, updateData);
    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(model);
  } catch (error: any) {
    console.error('Models API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    getDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    const success = deleteModel(parseInt(id));
    if (!success) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Models API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}

// Fetch models from provider
export async function PATCH(request: NextRequest) {
  try {
    getDatabase();
    const body = await request.json();
    const { provider_id } = body;

    if (!provider_id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    const provider = getProviderById(provider_id);
    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    const adapter = getProviderAdapter(provider.protocol);
    const models = await adapter.listModels(provider);

    // Create or update models
    const results = [];
    for (const modelInfo of models) {
      try {
        const existing = getAllModels().find(
          m => m.provider_id === provider_id && m.model_id === modelInfo.id
        );

        if (existing) {
          updateModel(existing.id, {
            name: modelInfo.name,
            model_id: modelInfo.id,
          });
          results.push({ ...existing, name: modelInfo.name });
        } else {
          const newModel = createModel({
            provider_id,
            name: modelInfo.name,
            model_id: modelInfo.id,
            enabled: false, // 默认关闭
          });
          results.push(newModel);
        }
      } catch (error: any) {
        console.error(`Failed to create/update model ${modelInfo.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      models: results,
      count: results.length,
    });
  } catch (error: any) {
    console.error('Models API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}
