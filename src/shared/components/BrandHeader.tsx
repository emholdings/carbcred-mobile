import type { ReactNode } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Bell, ChevronLeft } from 'lucide-react-native';
import { useInboxCount } from '@shared/hooks/useInboxCount';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';

/**
 * The green band every screen opens on.
 *
 * Forest is the brand's near-black, so it carries a header the way a dark navy
 * does — cream type on it reads at arm's length in sunlight, which a light
 * header does not. Flat colour, no gradients or overlays: the leaf stripe along
 * the bottom is the second brand colour doing the work of a divider, and the
 * mark sits top-right where it does not compete with the screen's title.
 *
 * Back lives here rather than on each screen: any screen pushed onto a stack
 * can go back, so the band asks the navigator instead of being told.
 */
export function BrandHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const waiting = useInboxCount();

  return (
    <View
      style={{
        backgroundColor: isDark ? '#0a2117' : brand.forest,
        paddingTop: insets.top + 14,
        paddingBottom: children ? 20 : 22,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 26,
        borderBottomRightRadius: 26,
        borderBottomWidth: 4,
        borderBottomColor: brand.leaf,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        {canGoBack ? (
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            // Generous target: this is tapped with gloves on and one hand.
            hitSlop={12}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(250, 247, 241, 0.12)',
              marginLeft: -4,
            }}
          >
            <ChevronLeft color={brand.cream} size={24} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: brand.cream, fontSize: 26, fontWeight: '700' }}>{title}</Text>
          {subtitle ? (
            <Text style={{ color: brand.leaf, fontSize: 14, fontWeight: '500' }}>{subtitle}</Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
          {/* The bell counts the same inbox the Tasks tab shows, so the two
              can never disagree about how much is waiting. */}
          <Pressable
            onPress={() => navigation.getParent()?.navigate('Tasks' as never)}
            accessibilityRole="button"
            accessibilityLabel={
              waiting > 0 ? `${waiting} waiting for you` : 'Nothing waiting for you'
            }
            hitSlop={10}
          >
            <Bell color={brand.cream} size={22} />
            {waiting > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: -5,
                  right: -7,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  paddingHorizontal: 4,
                  backgroundColor: '#f97066',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '800' }}>
                  {waiting > 9 ? '9+' : waiting}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <Image
            source={require('@assets/mark.png')}
            style={{ width: 38, height: 38 }}
            resizeMode="contain"
          />
        </View>
      </View>

      {children ? <View style={{ marginTop: 16 }}>{children}</View> : null}
    </View>
  );
}
