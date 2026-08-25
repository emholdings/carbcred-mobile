import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { Check, ChevronDown, X } from 'lucide-react-native';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';

/**
 * One of a long fixed list, chosen from a sheet.
 *
 * The short lists stay as chips — everything visible at once, one tap. This is
 * for the ones that would fill the screen: seventeen seats around a community
 * table cannot be chips without burying the rest of the form. The list still
 * comes from the server, so the app never invents an option the register does
 * not recognise.
 */
export function PickerField({
  label,
  options,
  value,
  onChange,
  placeholder = 'Choose one',
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const { scheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: scheme.textMuted, fontSize: 13, fontWeight: '600' }}>{label}</Text>

      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: scheme.surface,
          borderWidth: 1,
          borderColor: scheme.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 13,
        }}
      >
        <Text style={{ color: value ? scheme.text : scheme.textMuted, fontSize: 16, flex: 1 }}>
          {value || placeholder}
        </Text>
        <ChevronDown color={scheme.textMuted} size={18} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(14, 43, 30, 0.45)' }}>
          <View
            style={{
              backgroundColor: scheme.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 14,
              paddingBottom: 28,
              maxHeight: '75%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 10 }}>
              <Text style={{ color: scheme.text, fontSize: 17, fontWeight: '700', flex: 1 }}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel="Close">
                <X color={scheme.textMuted} size={22} />
              </Pressable>
            </View>

            <FlatList
              data={options}
              keyExtractor={(option) => option}
              renderItem={({ item }) => {
                const chosen = item === value;

                return (
                  <Pressable
                    onPress={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingHorizontal: 18,
                      paddingVertical: 15,
                      borderTopWidth: 1,
                      borderTopColor: scheme.border,
                    }}
                  >
                    <Text
                      style={{
                        color: chosen ? brand.deepLeaf : scheme.text,
                        fontSize: 16,
                        fontWeight: chosen ? '700' : '400',
                        flex: 1,
                      }}
                    >
                      {item}
                    </Text>
                    {chosen ? <Check color={brand.deepLeaf} size={18} strokeWidth={3} /> : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
