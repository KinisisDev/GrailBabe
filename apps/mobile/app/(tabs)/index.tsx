/**
 * GrailBabe — Vault Tab (index.tsx)
 * Full vault screen: category filter, FlatList grid, pull-to-refresh, empty state, FAB
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { VaultItemCard } from '../../src/components/vault/VaultItemCard';
import { useVault } from '../../src/hooks/useVault';

// ─── Category filter config ───────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'pokemon', label: '⚡ Pokémon' },
  { key: 'mtg', label: '🃏 MTG' },
  { key: 'one_piece', label: '☠️ One Piece' },
  { key: 'sports', label: '🏆 Sports' },
  { key: 'lego', label: '🧱 Lego' },
  { key: 'other', label: '📦 Other' },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]['key'];

// ─── Sort options ─────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: 'recent', label: 'Recent' },
  { key: 'value_desc', label: 'Value ↓' },
  { key: 'value_asc', label: 'Value ↑' },
  { key: 'name', label: 'A–Z' },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]['key'];

// ─── Component ────────────────────────────────────────────────────────────────
export default function VaultScreen() {
  const { items, loading, refreshing, totalValue, refresh } = useVault();

  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [activeSort, setActiveSort] = useState<SortKey>('recent');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<TextInput>(null);

  // Focus search input when toggled
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchRef.current?.focus(), 100);
    } else {
      setSearch('');
    }
  }, [showSearch]);

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const displayItems = useMemo(() => {
    let filtered = items;

    // Category filter
    if (activeCategory !== 'all') {
      filtered = filtered.filter((i) => i.category === activeCategory);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          i.set_name?.toLowerCase().includes(q) ||
          i.collector_number?.toLowerCase().includes(q),
      );
    }

    // Sort
    const sorted = [...filtered];
    switch (activeSort) {
      case 'value_desc':
        sorted.sort((a, b) => (b.current_value ?? 0) - (a.current_value ?? 0));
        break;
      case 'value_asc':
        sorted.sort((a, b) => (a.current_value ?? 0) - (b.current_value ?? 0));
        break;
      case 'name':
        sorted.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
        break;
      case 'recent':
      default:
        sorted.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    }

    return sorted;
  }, [items, activeCategory, search, activeSort]);

  // ── Category counts ─────────────────────────────────────────────────────────
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    for (const item of items) {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleItemPress = useCallback((id: string) => {
    router.push(`/vault/${id}`);
  }, []);

  const handleScanPress = useCallback(() => {
    router.push('/scanner');
  }, []);

  // ── Render helpers ──────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <VaultItemCard
        item={item}
        onPress={() => handleItemPress(item.id)}
        style={index % 2 === 0 ? styles.cardLeft : styles.cardRight}
      />
    ),
    [handleItemPress],
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  const ListHeader = (
    <View>
      {/* ── Value banner ── */}
      <View style={styles.valueBanner}>
        <Text style={styles.valueBannerLabel}>Total Vault Value</Text>
        <Text style={styles.valueBannerAmount}>
          ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </Text>
        <Text style={styles.valueBannerCount}>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* ── Sort chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortRow}
      >
        {SORT_OPTIONS.map((s) => (
          <Pressable
            key={s.key}
            style={[styles.sortChip, activeSort === s.key && styles.sortChipActive]}
            onPress={() => setActiveSort(s.key as SortKey)}
          >
            <Text
              style={[
                styles.sortChipText,
                activeSort === s.key && styles.sortChipTextActive,
              ]}
            >
              {s.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* ── Search bar (conditional) ── */}
      {showSearch && (
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
          <TextInput
            ref={searchRef}
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search cards, sets…"
            placeholderTextColor="#6b7280"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#6b7280" />
            </Pressable>
          )}
        </View>
      )}

      {/* ── Result count ── */}
      {(activeCategory !== 'all' || search.trim()) && (
        <Text style={styles.resultCount}>
          {displayItems.length} result{displayItems.length !== 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );

  const ListEmpty = (
    <View style={styles.emptyState}>
      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" />
      ) : (
        <>
          <Text style={styles.emptyEmoji}>
            {search.trim() || activeCategory !== 'all' ? '🔍' : '📦'}
          </Text>
          <Text style={styles.emptyTitle}>
            {search.trim() || activeCategory !== 'all'
              ? 'No cards match'
              : 'Your vault is empty'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {search.trim() || activeCategory !== 'all'
              ? 'Try a different filter or search term'
              : 'Tap the scan button to add your first card'}
          </Text>
          {activeCategory === 'all' && !search.trim() && (
            <Pressable style={styles.emptyButton} onPress={handleScanPress}>
              <Ionicons name="scan" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Scan a Card</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vault</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.headerBtn}
            onPress={() => setShowSearch((v) => !v)}
          >
            <Ionicons
              name={showSearch ? 'search-outline' : 'search'}
              size={22}
              color={showSearch ? '#6366f1' : '#d1d5db'}
            />
          </Pressable>
        </View>
      </View>

      {/* ── Category tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
        style={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const count = categoryCounts[cat.key] ?? 0;
          const active = activeCategory === cat.key;
          return (
            <Pressable
              key={cat.key}
              style={[styles.categoryTab, active && styles.categoryTabActive]}
              onPress={() => setActiveCategory(cat.key as CategoryKey)}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  active && styles.categoryTabTextActive,
                ]}
              >
                {cat.label}
              </Text>
              {count > 0 && (
                <View style={[styles.categoryBadge, active && styles.categoryBadgeActive]}>
                  <Text
                    style={[
                      styles.categoryBadgeText,
                      active && styles.categoryBadgeTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Grid ── */}
      <FlatList
        data={displayItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={displayItems.length > 0 ? styles.row : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={5}
      />

      {/* ── FAB ── */}
      <Pressable style={styles.fab} onPress={handleScanPress}>
        <Ionicons name="scan" size={26} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f9fafb',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#1f2937',
  },

  // Category tabs
  categoryScroll: {
    maxHeight: 44,
  },
  categoryRow: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1f2937',
  },
  categoryTabActive: {
    backgroundColor: '#4f46e5',
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9ca3af',
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  categoryBadge: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  categoryBadgeActive: {
    backgroundColor: '#6366f1',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9ca3af',
  },
  categoryBadgeTextActive: {
    color: '#fff',
  },

  // Value banner
  valueBanner: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  valueBannerLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  valueBannerAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#f9fafb',
    marginTop: 4,
    letterSpacing: -1,
  },
  valueBannerCount: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },

  // Sort chips
  sortRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  sortChipActive: {
    backgroundColor: '#312e81',
    borderColor: '#6366f1',
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  sortChipTextActive: {
    color: '#a5b4fc',
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#f9fafb',
  },

  // Result count
  resultCount: {
    fontSize: 12,
    color: '#6b7280',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  // Grid
  grid: {
    paddingBottom: 100,
  },
  row: {
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
  },
  cardLeft: {
    flex: 1,
  },
  cardRight: {
    flex: 1,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
});
