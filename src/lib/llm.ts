import { OpenAI } from 'openai';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const eventSchema = z.object({
    name: z.string().describe('イベント名'),
    date: z.string().nullable().describe('イベントの開催日（YYYY-MM-DD形式、不明な場合はnull）'),
    baseAmount: z.number().describe('基本参加費（数値）'),
    conditions: z.array(z.object({
        type: z.enum(['radio', 'checkbox']).describe('条件のタイプ（radioまたはcheckbox）'),
        label: z.string().describe('条件の説明'),
        options: z.array(z.object({
            label: z.string().describe('選択肢の名前'),
            priceModifier: z.number().describe('追加または減額される金額（数値）'),
        })).describe('条件の選択肢とその追加金額'),
    })).describe('金額条件の配列'),
});

export type EventData = z.infer<typeof eventSchema>;

export async function createEventFromMessages(messageHistory: string[]): Promise<EventData> {
    const promptPath = path.join(process.cwd(), 'src', 'prompts', 'event_creation.yaml');
    const promptContent = fs.readFileSync(promptPath, 'utf-8');
    const promptData = yaml.parse(promptContent);

    const messageHistoryText = messageHistory
        .map((msg, index) => `[${index + 1}] ${msg}`)
        .join('\n');

    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const jstDateStr = jstNow.toISOString().split('T')[0];
    const jstTimeStr = jstNow.toISOString().split('T')[1].split('.')[0];

    const systemPrompt = promptData.system
        .replace('{current_date}', jstDateStr)
        .replace('{current_time}', jstTimeStr);
    const userPrompt = promptData.user
        .replace('{message_history}', messageHistoryText)
        .replace('{current_date}', jstDateStr)
        .replace('{current_time}', jstTimeStr);

    const requestParams = {
        model: 'gpt-5.1',
        messages: [
            { role: 'system' as const, content: systemPrompt },
            { role: 'user' as const, content: userPrompt },
        ],
        max_completion_tokens: 1024,
        response_format: { type: 'json_object' as const },
        reasoning_effort: 'low'
    };
    console.log('requestParams:', requestParams);
    const completion = await openai.chat.completions.create(requestParams as never);

    const responseText = (completion as { choices: Array<{ message?: { content?: string } }> }).choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseText);

    console.log('parsed response:', JSON.stringify(parsed, null, 2));

    return eventSchema.parse(parsed);
}

