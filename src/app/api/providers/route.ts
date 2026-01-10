import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db/database';
import { getAllProviders, getProviderById, createProvider, updateProvider, deleteProvider } from '@/db/queries';
import { encryptApiKey, decryptApiKey } from '@/server/crypto';

// Ensure Node.js runtime (required for SQLite)
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    getDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const includeKey = searchParams.get('includeKey') === 'true';

    // If ID is provided, return single provider (for editing)
    if (id) {
      const provider = getProviderById(parseInt(id));
      if (!provider) {
        return NextResponse.json(
          { error: 'Provider not found' },
          { status: 404 }
        );
      }
      // Return with decrypted API key if requested (for editing)
      return NextResponse.json({
        ...provider,
        api_key: includeKey ? decryptApiKey(provider.api_key) : '***',
      });
    }

    // Return all providers
    const providers = getAllProviders();
    // Don't return API keys in list view
    const sanitized = providers.map(p => ({
      ...p,
      api_key: '***',
    }));
    return NextResponse.json(sanitized);
  } catch (error: any) {
    console.error('Providers API error:', error);
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
    const { name, protocol, base_url, api_key } = body;

    if (!name || !protocol || !base_url || !api_key) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const encryptedKey = encryptApiKey(api_key.trim());
    const provider = createProvider({
      name,
      protocol,
      base_url,
      api_key: encryptedKey,
    });

    return NextResponse.json({
      ...provider,
      api_key: '***',
    });
  } catch (error: any) {
    console.error('Providers API error:', error);
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
    const { id, name, protocol, base_url, api_key } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    const existingProvider = getProviderById(id);
    if (!existingProvider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (protocol !== undefined) updateData.protocol = protocol;
    if (base_url !== undefined) updateData.base_url = base_url;
    if (api_key !== undefined && api_key !== null && api_key.trim() !== '') {
      updateData.api_key = encryptApiKey(api_key.trim());
    }

    const provider = updateProvider(id, updateData);
    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...provider,
      api_key: '***',
    });
  } catch (error: any) {
    console.error('Providers API error:', error);
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
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    const success = deleteProvider(parseInt(id));
    if (!success) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Providers API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}
