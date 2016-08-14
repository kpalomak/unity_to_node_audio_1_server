#!/usr/bin/perl

open(WORDS,"</home/siak/siak/aalto_recordings/prompts/wordlist_random.txt");



while(<WORDS>) {
  $word=$_;
  $word=~s/\n//;
  open(FILE,"<words.conf");
  $fout_name="${word}.conf";
  open(FOUT_NAME,">$fout_name");
  while(<FILE>){
    $line=$_;

    $line=~s/words.1bo/$word\.2bo/;
    print FOUT_NAME $line;
  }
  close(FOUT_NAME); 
  close(FILE);
}
