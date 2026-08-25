import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronRight, Circle, CircleDot, MessageSquare } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LoadState } from '@shared/components/QueryState';
import { Screen } from '@shared/components/Screen';
import type { MoreStackParamList } from '@navigation/types';
import { useAuthStore } from '@stores/authStore';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';
import { fetchProject, phaseProgress, type Workflow, type WorkflowPhase, type WorkflowTask } from '../api';

type Props = NativeStackScreenProps<MoreStackParamList, 'ProjectDetail'>;

/**
 * Where a project has got to, as the platform sees it: the phase stepper, and
 * inside the phase currently in progress, the tasks it is actually waiting on.
 * Completed phases collapse to a line — the useful question is what is next.
 */
export function ProjectDetailScreen({ route, navigation }: Props) {
  const { scheme } = useTheme();
  const organisationSlug = useAuthStore((state) => state.organisationSlug);
  const { slug, name } = route.params;

  const query = useQuery({
    queryKey: ['project', organisationSlug, slug],
    queryFn: () => fetchProject(organisationSlug!, slug),
    enabled: Boolean(organisationSlug),
  });
  const { data, refetch, isRefetching } = query;

  const progress = phaseProgress(data?.workflow ?? null);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ gap: 18, paddingVertical: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={scheme.textMuted} />}
      >
        <View style={{ gap: 4 }}>
          <Text style={{ color: scheme.text, fontSize: 24, fontWeight: '700' }}>{name}</Text>
          {data ? (
            <Text style={{ color: scheme.textMuted, fontSize: 14 }}>
              {[data.status_label, data.sites.length ? `${data.sites.length} site${data.sites.length === 1 ? '' : 's'}` : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          ) : null}
        </View>

        <LoadState query={query} rows={5} />

        <Pressable
          onPress={() => navigation.navigate('Discussion', { projectSlug: slug, name })}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: scheme.surface,
            borderColor: scheme.border,
            borderWidth: 1,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <MessageSquare color={brand.deepLeaf} size={20} />
          <Text style={{ color: scheme.text, fontSize: 15, fontWeight: '600', flex: 1 }}>Discussion</Text>
          <ChevronRight color={scheme.textMuted} size={18} />
        </Pressable>

        {data?.workflow ? (
          <>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: scheme.text, fontSize: 15, fontWeight: '600' }}>
                  {progress.done} of {progress.total} phases complete
                </Text>
                <Text style={{ color: scheme.textMuted, fontSize: 15 }}>{progress.percent}%</Text>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: scheme.border, overflow: 'hidden' }}>
                <View style={{ width: `${progress.percent}%`, height: 8, backgroundColor: scheme.accent }} />
              </View>
            </View>

            <View style={{ gap: 10 }}>
              {data.workflow.phases.map((phase) => (
                <Phase key={phase.id} phase={phase} expanded={phase.id === openPhaseId(data.workflow)} />
              ))}
            </View>
          </>
        ) : data ? (
          <Text style={{ color: scheme.textMuted, fontSize: 14 }}>
            This project has no workflow yet, so there is nothing to step through.
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/**
 * Which phase to open. The live phase, when it still has work in it — but a
 * phase can be in progress with everything in it already approved, waiting on an
 * approval rather than on a person. In that case the next real work is in the
 * phase after it, and showing an empty box would answer nothing.
 */
function openPhaseId(workflow: Workflow | null): number | null {
  const withWork = (workflow?.phases ?? []).filter((phase) => outstandingIn(phase).length > 0);
  const live = withWork.find((phase) => phase.status === 'in_progress');

  return (live ?? withWork[0])?.id ?? null;
}

function outstandingIn(phase: WorkflowPhase): WorkflowTask[] {
  return phase.stages.flatMap((stage) => stage.tasks).filter((task) => task.status !== 'approved');
}

function Phase({ phase, expanded }: { phase: WorkflowPhase; expanded: boolean }) {
  const { scheme } = useTheme();
  const done = phase.status === 'completed';
  const active = phase.status === 'in_progress';
  const outstanding = expanded ? outstandingIn(phase) : [];

  return (
    <View
      style={{
        backgroundColor: scheme.surface,
        borderColor: active ? scheme.accent : scheme.border,
        borderWidth: active ? 2 : 1,
        borderRadius: 14,
        padding: 14,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {done ? (
          <Check color={scheme.accent} size={18} strokeWidth={3} />
        ) : active ? (
          <CircleDot color={scheme.accent} size={18} />
        ) : (
          <Circle color={scheme.textMuted} size={18} />
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: done ? scheme.textMuted : scheme.text,
              fontSize: 16,
              fontWeight: active ? '700' : '500',
            }}
          >
            {phase.name}
          </Text>
          <Text style={{ color: scheme.textMuted, fontSize: 13 }}>
            {phase.status_label}
            {!expanded && outstandingIn(phase).length > 0
              ? ` · ${outstandingIn(phase).length} to do`
              : ''}
          </Text>
        </View>
      </View>

      {outstanding.length > 0 ? (
        <View style={{ gap: 6, paddingLeft: 28 }}>
          {outstanding.map((task) => (
            <View key={task.id} style={{ gap: 1 }}>
              <Text style={{ color: scheme.text, fontSize: 14 }}>{task.title}</Text>
              <Text style={{ color: scheme.textMuted, fontSize: 12 }}>
                {[task.status_label, task.assignee, task.due_date ? `due ${task.due_date}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
