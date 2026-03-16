import React from 'react';
import {
  View, Text, Switch, TouchableOpacity, TextInput, StyleSheet,
} from 'react-native';
import { Colors } from '../../constants/colors';

type RowType = 'toggle' | 'select' | 'text' | 'button' | 'info' | 'danger';

interface BaseProps {
  label: string;
  hint?: string;
  last?: boolean;
}

interface ToggleProps extends BaseProps { type: 'toggle'; value: boolean; onValueChange: (v: boolean) => void; }
interface SelectProps extends BaseProps { type: 'select'; value: string; onPress: () => void; }
interface TextProps  extends BaseProps { type: 'text'; value: string; onChangeText: (v: string) => void; placeholder?: string; }
interface ButtonProps extends BaseProps { type: 'button'; onPress: () => void; }
interface InfoProps  extends BaseProps { type: 'info'; value: string; }
interface DangerProps extends BaseProps { type: 'danger'; onPress: () => void; }

type Props = ToggleProps | SelectProps | TextProps | ButtonProps | InfoProps | DangerProps;

export default function SettingsRow(props: Props) {
  const { label, hint, last } = props;
  const rowStyle = [s.row, last && s.rowLast];

  if (props.type === 'toggle') {
    return (
      <View style={rowStyle}>
        <View style={s.labelCol}>
          <Text style={s.label}>{label}</Text>
          {hint && <Text style={s.hint}>{hint}</Text>}
        </View>
        <Switch
          value={props.value}
          onValueChange={props.onValueChange}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor="#fff"
        />
      </View>
    );
  }

  if (props.type === 'select') {
    return (
      <TouchableOpacity style={rowStyle} onPress={props.onPress} activeOpacity={0.7}>
        <View style={s.labelCol}>
          <Text style={s.label}>{label}</Text>
          {hint && <Text style={s.hint}>{hint}</Text>}
        </View>
        <View style={s.selectRight}>
          <Text style={s.selectValue}>{props.value}</Text>
          <Text style={s.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (props.type === 'text') {
    return (
      <View style={[rowStyle, s.colRow]}>
        <Text style={s.label}>{label}</Text>
        {hint && <Text style={s.hint}>{hint}</Text>}
        <TextInput
          style={s.input}
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder ?? ''}
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    );
  }

  if (props.type === 'button') {
    return (
      <TouchableOpacity style={rowStyle} onPress={props.onPress} activeOpacity={0.7}>
        <Text style={s.buttonLabel}>{label}</Text>
      </TouchableOpacity>
    );
  }

  if (props.type === 'info') {
    return (
      <View style={rowStyle}>
        <Text style={s.label}>{label}</Text>
        <Text style={s.infoValue}>{props.value}</Text>
      </View>
    );
  }

  if (props.type === 'danger') {
    return (
      <TouchableOpacity style={rowStyle} onPress={props.onPress} activeOpacity={0.7}>
        <Text style={s.dangerLabel}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return null;
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    minHeight: 48,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  colRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  labelCol: {
    flex: 1,
    paddingRight: 12,
  },
  label: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: Colors.text,
  },
  hint: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },
  selectRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectValue: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: Colors.textSecondary,
    maxWidth: 160,
  },
  chevron: {
    fontSize: 18,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  input: {
    width: '100%',
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: 9,
    fontFamily: 'monospace',
    fontSize: 13,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  buttonLabel: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  infoValue: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  dangerLabel: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '600',
  },
});
