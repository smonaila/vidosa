namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addChannelSubscriptions : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.ChannelSubs",
                c => new
                    {
                        Id = c.Int(nullable: false, identity: true),
                        Username = c.String(),
                        ChannelId = c.String(),
                    })
                .PrimaryKey(t => t.Id);
            
        }
        
        public override void Down()
        {
            DropTable("dbo.ChannelSubs");
        }
    }
}
